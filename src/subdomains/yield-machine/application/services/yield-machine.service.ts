import { Injectable, NotFoundException } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { TokenProviderService } from 'src/blockchain/ain/whale/token-provider.service';
import { TransactionExecutionService } from 'src/integration/transaction/application/services/transaction-execution.service';
import { VaultService } from 'src/subdomains/yield-machine/application/services/vault.service';
import { Vault } from 'src/subdomains/yield-machine/domain/entities/vault.entity';
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
  WithdrawFromVaultParameters,
} from '../dto/transaction-parameters.dto';

@Injectable()
export class YieldMachineService {
  constructor(
    private readonly transactionExecutionService: TransactionExecutionService,
    private readonly vaultService: VaultService,
    private readonly tokenProviderService: TokenProviderService,
  ) {}

  async create(command: TransactionCommand, parameters: any): Promise<string> {
    const vault = await this.retrieveVault(parameters);
    if (!vault) throw new NotFoundException('Vault or address not found');

    switch (command) {
      case TransactionCommand.ACCOUNT_TO_ACCOUNT:
        const sendTokenParameters = parameters as SendTokenParameters;
        const token = await this.tokenProviderService.get(sendTokenParameters.token);
        return this.sendToken(sendTokenParameters, +token.id, vault.wallet, vault.accountIndex);
      case TransactionCommand.CREATE_VAULT:
        return this.createVault(parameters as CreateVaultParameters, vault.wallet, vault.accountIndex);
      case TransactionCommand.DEPOSIT_TO_VAULT:
        return this.depositToVault(vault, parameters as DepositToVaultParameters);
      case TransactionCommand.WITHDRAW_FROM_VAULT:
        return this.withdrawFromVault(vault, parameters as WithdrawFromVaultParameters);
      case TransactionCommand.TAKE_LOAN:
        return this.takeLoan(vault, parameters as TakeLoanParameters);
      case TransactionCommand.PAYBACK_LOAN:
        return this.paybackLoan(vault, parameters as PaybackLoanParameters);
      case TransactionCommand.POOL_ADD_LIQUIDITY:
        return this.addPoolLiquidity(vault, parameters as AddPoolLiquidityParameters);
      case TransactionCommand.POOL_REMOVE_LIQUIDITY:
        return this.removePoolLiquidity(vault, parameters as RemovePoolLiquidityParameters);
      case TransactionCommand.COMPOSITE_SWAP:
        const compositeSwapParameters = parameters as CompositeSwapParameters;
        const fromToken = await this.tokenProviderService.get(compositeSwapParameters.fromToken);
        const toToken = await this.tokenProviderService.get(compositeSwapParameters.toToken);
        return this.compositeSwap(
          compositeSwapParameters,
          +fromToken.id,
          +toToken.id,
          vault.wallet,
          vault.accountIndex,
        );
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
      from: parameters.address,
      vault: parameters.vault,
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
