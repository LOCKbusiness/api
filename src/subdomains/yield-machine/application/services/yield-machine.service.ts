import { Injectable, NotFoundException } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { TokenProviderService } from 'src/blockchain/ain/whale/token-provider.service';
import { Config } from 'src/config/config';
import { TransactionExecutionService } from 'src/integration/transaction/application/services/transaction-execution.service';
import { VaultService } from 'src/integration/vault/application/services/vault.service';
import { Vault } from 'src/integration/vault/domain/entities/vault.entity';
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
  constructor(
    private readonly transactionExecutionService: TransactionExecutionService,
    private readonly vaultService: VaultService,
    private readonly tokenProviderService: TokenProviderService,
  ) {}

  async create({ command, parameters }: TransactionInput): Promise<string> {
    const isSendFromLiq =
      command === TransactionCommand.ACCOUNT_TO_ACCOUNT && parameters.from === Config.yieldMachine.liquidity.address;

    const vault = await this.retrieveVault(parameters);
    if (!isSendFromLiq && !vault) throw new NotFoundException('Vault or address not found');

    switch (command) {
      case TransactionCommand.ACCOUNT_TO_ACCOUNT:
        const token = await this.tokenProviderService.get(parameters.token);
        const wallet = isSendFromLiq ? Config.yieldMachine.liquidity.wallet : vault.wallet;
        const accountIndex = isSendFromLiq ? Config.yieldMachine.liquidity.account : vault.accountIndex;
        return this.sendToken(parameters, +token.id, wallet, accountIndex);
      case TransactionCommand.CREATE_VAULT:
        return this.createVault(parameters, vault.wallet, vault.accountIndex);
      case TransactionCommand.DEPOSIT_TO_VAULT:
        const depositToken = await this.tokenProviderService.get(parameters.token);
        return this.depositToVault(vault, parameters, +depositToken.id);
      case TransactionCommand.WITHDRAW_FROM_VAULT:
        const withdrawToken = await this.tokenProviderService.get(parameters.token);
        return this.withdrawFromVault(vault, parameters, +withdrawToken.id);
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

  depositToVault(vault: Vault, parameters: DepositToVaultParameters, token: number): Promise<string> {
    return this.transactionExecutionService.depositToVault({
      from: Config.yieldMachine.liquidity.address,
      vault: vault.vault,
      token,
      amount: new BigNumber(parameters.amount),
      ownerWallet: Config.yieldMachine.liquidity.wallet,
      accountIndex: Config.yieldMachine.liquidity.account,
    });
  }

  private withdrawFromVault(vault: Vault, parameters: WithdrawFromVaultParameters, token?: number): Promise<string> {
    return this.transactionExecutionService.withdrawFromVault({
      to: Config.yieldMachine.liquidity.address,
      executingAddress: vault.address,
      vault: vault.vault,
      token: token ?? vault.blockchainPairTokenBId,
      amount: new BigNumber(parameters.amount),
      ownerWallet: vault.wallet,
      accountIndex: vault.accountIndex,
    });
  }

  private takeLoan(vault: Vault, parameters: TakeLoanParameters): Promise<string> {
    return this.transactionExecutionService.takeLoan({
      to: Config.yieldMachine.liquidity.address,
      executingAddress: vault.address,
      vault: vault.vault,
      token: vault.blockchainPairTokenAId,
      amount: new BigNumber(parameters.amount),
      ownerWallet: vault.wallet,
      accountIndex: vault.accountIndex,
    });
  }

  paybackLoan(vault: Vault, parameters: PaybackLoanParameters): Promise<string> {
    return this.transactionExecutionService.paybackLoan({
      from: Config.yieldMachine.liquidity.address,
      vault: vault.vault,
      token: vault.blockchainPairTokenAId,
      amount: new BigNumber(parameters.amount),
      ownerWallet: Config.yieldMachine.liquidity.wallet,
      accountIndex: Config.yieldMachine.liquidity.account,
    });
  }

  private addPoolLiquidity(vault: Vault, parameters: AddPoolLiquidityParameters): Promise<string> {
    return this.transactionExecutionService.addPoolLiquidity({
      from: vault.address,
      executingAddress: Config.yieldMachine.liquidity.address,
      partA: {
        token: vault.blockchainPairTokenAId,
        amount: new BigNumber(parameters.partAAmount),
      },
      partB: {
        token: vault.blockchainPairTokenBId,
        amount: new BigNumber(parameters.partBAmount),
      },
      ownerWallet: Config.yieldMachine.liquidity.wallet,
      accountIndex: Config.yieldMachine.liquidity.account,
    });
  }

  removePoolLiquidity(vault: Vault, parameters: RemovePoolLiquidityParameters): Promise<string> {
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
