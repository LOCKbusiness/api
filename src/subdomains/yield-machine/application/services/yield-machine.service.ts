import { AddressToken } from '@defichain/whale-api-client/dist/api/address';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import BigNumber from 'bignumber.js';
import { TokenProviderService } from 'src/blockchain/ain/whale/token-provider.service';
import { WhaleClient } from 'src/blockchain/ain/whale/whale-client';
import { WhaleService } from 'src/blockchain/ain/whale/whale.service';
import { Config } from 'src/config/config';
import { TransactionExecutionService } from 'src/integration/transaction/application/services/transaction-execution.service';
import { VaultService } from 'src/integration/vault/application/services/vault.service';
import { Vault } from 'src/integration/vault/domain/entities/vault.entity';
import { Lock } from 'src/shared/lock';
import { TransactionCommand } from '../../domain/enums';
import {
  AddPoolLiquidityParameters,
  CompositeSwapParameters,
  CreateVaultParameters,
  DepositToVaultParameters,
  PaybackLoanParameters,
  RemovePoolLiquidityParameters,
  SendTokenParameters,
  TakeLoanParameters,
  TransactionInput,
  WithdrawFromVaultParameters,
} from '../dto/transaction-parameters.dto';

@Injectable()
export class YieldMachineService {
  private readonly emergencyVaultCheckLock = new Lock(600);

  private whaleClient: WhaleClient;
  constructor(
    private readonly transactionExecutionService: TransactionExecutionService,
    private readonly vaultService: VaultService,
    private readonly tokenProviderService: TokenProviderService,
    private readonly whaleService: WhaleService,
  ) {
    whaleService.getClient().subscribe((client) => (this.whaleClient = client));

    this.checkVaultsForEmergency();
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkVaultsForEmergency() {
    if (!this.emergencyVaultCheckLock.acquire()) return;
    const vaults = await this.vaultService.getAll();
    const vaultInfos = await Promise.all(
      vaults.filter((v) => v.vault).map((v) => this.whaleClient.getVault(v.address, v.vault)),
    );
    const allEmergencyProcesses: Promise<unknown>[] = [];
    for (const vault of vaultInfos) {
      const dbVault = vaults.find((v) => v.vault === vault.vaultId);
      // TODO (Krysh) change to emergency ratio
      if (dbVault.minCollateralRatio < +vault.collateralRatio) {
        console.info(`starting emergency payback for ${dbVault.vault} on ${dbVault.address}`);
        try {
          allEmergencyProcesses.push(this.executeEmergencyFor(dbVault));
        } catch (e) {
          console.error('Exception during vault emergency check:', e);
        }
      }
    }
    await Promise.all(allEmergencyProcesses);
    console.info(`finished emergency check`);
    this.emergencyVaultCheckLock.release();
  }

  private async executeEmergencyFor(vault: Vault): Promise<string[]> {
    const logId = `${vault.address} (${vault.vault})`;
    let tokens = await this.whaleClient.getBalancesOf(vault.address);
    const amountToRemoveFromPool = this.amountOf(vault.blockchainPairId, tokens);
    if (!amountToRemoveFromPool) throw new Error(`${logId}: No pool liquidity found for vault: ${vault.vault}`);
    console.info(`${logId}: Removing ${amountToRemoveFromPool} of pool ${vault.blockchainPairId}`);
    const removePoolTx = await this.removePoolLiquidity(vault, {
      amount: +amountToRemoveFromPool,
      address: vault.address,
    });
    await this.whaleClient.waitForTx(removePoolTx);
    // read again from blockchain to know how many tokens can be payed back
    tokens = await this.whaleClient.getBalancesOf(vault.address);
    const savingTxs: Promise<string>[] = [];
    const amountToPayback = this.amountOf(vault.blockchainPairTokenAId, tokens);
    if (amountToPayback) {
      console.info(`${logId}: Paying back ${amountToPayback} of ${vault.blockchainPairTokenAId}`);
      const paybackTx = await this.paybackLoan(vault, {
        amount: +amountToPayback,
        address: vault.address,
        vault: vault.vault,
      });
      savingTxs.push(this.whaleClient.waitForTx(paybackTx));
    }
    const amountToDeposit = this.amountOf(vault.blockchainPairTokenBId, tokens);
    if (amountToDeposit) {
      console.info(`${logId}: Depositing ${amountToDeposit} of ${vault.blockchainPairTokenBId}`);
      const depositTx = await this.paybackLoan(vault, {
        amount: +amountToDeposit,
        address: vault.address,
        vault: vault.vault,
      });
      savingTxs.push(this.whaleClient.waitForTx(depositTx));
    }
    return Promise.all(savingTxs);
  }

  private amountOf(tokenId: number, tokens: AddressToken[]): string {
    return tokens.find((token) => +token.id === tokenId)?.amount;
  }

  async create({ command, parameters }: TransactionInput): Promise<string> {
    const isSendFromLiq =
      command === TransactionCommand.ACCOUNT_TO_ACCOUNT && parameters.from === Config.yieldMachine.liquidity.address;

    const vault = await this.retrieveVault(parameters);
    if (!isSendFromLiq && !vault) throw new NotFoundException('Vault or address not found');

    // additional checks for account to account txs
    if (command === TransactionCommand.ACCOUNT_TO_ACCOUNT) {
      const allowedAddresses = await this.vaultService
        .getAllAddresses()
        .then((addresses) => addresses.concat(Config.yieldMachine.liquidity.address));

      if (!this.isSendAllowed(parameters, allowedAddresses))
        throw new ForbiddenException('Send parameters are not allowed');
    }

    switch (command) {
      case TransactionCommand.ACCOUNT_TO_ACCOUNT:
        const token = await this.tokenProviderService.get(parameters.token);
        const wallet = isSendFromLiq ? Config.yieldMachine.liquidity.wallet : vault.wallet;
        const accountIndex = isSendFromLiq ? Config.yieldMachine.liquidity.account : vault.accountIndex;
        return this.sendToken(parameters, +token.id, wallet, accountIndex);
      case TransactionCommand.CREATE_VAULT:
        return this.createVault(parameters, vault.wallet, vault.accountIndex);
      case TransactionCommand.DEPOSIT_TO_VAULT:
        return this.depositToVault(vault, parameters);
      case TransactionCommand.WITHDRAW_FROM_VAULT:
        return this.withdrawFromVault(vault, parameters);
      case TransactionCommand.TAKE_LOAN:
        return this.takeLoan(vault, parameters);
      case TransactionCommand.PAYBACK_LOAN:
        return this.paybackLoan(vault, parameters);
      case TransactionCommand.POOL_ADD_LIQUIDITY:
        return this.addPoolLiquidity(vault, parameters);
      case TransactionCommand.POOL_REMOVE_LIQUIDITY:
        return this.removePoolLiquidity(vault, parameters);
      case TransactionCommand.COMPOSITE_SWAP:
        const fromToken = await this.tokenProviderService.get(parameters.fromToken);
        const toToken = await this.tokenProviderService.get(parameters.toToken);
        return this.compositeSwap(parameters, +fromToken.id, +toToken.id, vault.wallet, vault.accountIndex);
    }
  }

  private isSendAllowed(parameters: SendTokenParameters, allowedAddresses: string[]): boolean {
    return (
      (parameters.token === 'DFI' && allowedAddresses.includes(parameters.from)) ||
      (allowedAddresses.includes(parameters.from) && allowedAddresses.includes(parameters.to))
    );
  }

  private sendToken(
    parameters: SendTokenParameters,
    tokenId: number,
    ownerWallet: string,
    accountIndex: number,
  ): Promise<string> {
    return this.transactionExecutionService.sendToken({
      from: parameters.from,
      to: parameters.to,
      balance: {
        token: tokenId,
        amount: new BigNumber(parameters.amount),
      },
      ownerWallet,
      accountIndex,
    });
  }

  private createVault(parameters: CreateVaultParameters, ownerWallet: string, accountIndex: number): Promise<string> {
    return this.transactionExecutionService.createVault({
      owner: parameters.address,
      ownerWallet,
      accountIndex,
    });
  }

  private depositToVault(vault: Vault, parameters: DepositToVaultParameters): Promise<string> {
    return this.transactionExecutionService.depositToVault({
      from: vault.address,
      vault: vault.vault,
      token: vault.blockchainPairTokenBId,
      amount: new BigNumber(parameters.amount),
      ownerWallet: vault.wallet,
      accountIndex: vault.accountIndex,
    });
  }

  private withdrawFromVault(vault: Vault, parameters: WithdrawFromVaultParameters): Promise<string> {
    return this.transactionExecutionService.withdrawFromVault({
      to: vault.address,
      vault: vault.vault,
      token: vault.blockchainPairTokenBId,
      amount: new BigNumber(parameters.amount),
      ownerWallet: vault.wallet,
      accountIndex: vault.accountIndex,
    });
  }

  private takeLoan(vault: Vault, parameters: TakeLoanParameters): Promise<string> {
    return this.transactionExecutionService.takeLoan({
      to: vault.address,
      vault: vault.vault,
      token: vault.blockchainPairTokenAId,
      amount: new BigNumber(parameters.amount),
      ownerWallet: vault.wallet,
      accountIndex: vault.accountIndex,
    });
  }

  private paybackLoan(vault: Vault, parameters: PaybackLoanParameters): Promise<string> {
    return this.transactionExecutionService.paybackLoan({
      from: vault.address,
      vault: vault.vault,
      token: vault.blockchainPairTokenAId,
      amount: new BigNumber(parameters.amount),
      ownerWallet: vault.wallet,
      accountIndex: vault.accountIndex,
    });
  }

  private addPoolLiquidity(vault: Vault, parameters: AddPoolLiquidityParameters): Promise<string> {
    return this.transactionExecutionService.addPoolLiquidity({
      from: vault.address,
      partA: {
        token: vault.blockchainPairTokenAId,
        amount: new BigNumber(parameters.partAAmount),
      },
      partB: {
        token: vault.blockchainPairTokenBId,
        amount: new BigNumber(parameters.partBAmount),
      },
      ownerWallet: vault.wallet,
      accountIndex: vault.accountIndex,
    });
  }

  private removePoolLiquidity(vault: Vault, parameters: RemovePoolLiquidityParameters): Promise<string> {
    return this.transactionExecutionService.removePoolLiquidity({
      from: vault.address,
      token: vault.blockchainPairId,
      amount: new BigNumber(parameters.amount),
      ownerWallet: vault.wallet,
      accountIndex: vault.accountIndex,
    });
  }

  private compositeSwap(
    parameters: CompositeSwapParameters,
    fromTokenId: number,
    toTokenId: number,
    ownerWallet: string,
    accountIndex: number,
  ): Promise<string> {
    return this.transactionExecutionService.compositeSwap({
      source: {
        from: parameters.address,
        token: fromTokenId,
        amount: new BigNumber(parameters.amount),
      },
      destination: {
        token: toTokenId,
      },
      ownerWallet,
      accountIndex,
    });
  }

  private async retrieveVault(parameters: any): Promise<Vault> {
    if ('vault' in parameters) return this.vaultService.getByAddressAndVault(parameters.address, parameters.vault);
    if ('from' in parameters) return this.vaultService.getByAddress(parameters.from);
    return this.vaultService.getByAddress(parameters.address);
  }
}
