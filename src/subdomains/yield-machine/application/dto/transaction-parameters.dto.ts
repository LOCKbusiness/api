import { IsNotEmpty, IsPositive, IsString } from 'class-validator';
import { TransactionCommand } from '../../domain/enums';

export class SendTokenParameters {
  @IsNotEmpty()
  @IsString()
  from: string;

  @IsNotEmpty()
  @IsString()
  to: string;

  @IsNotEmpty()
  @IsString()
  token: string;

  @IsPositive()
  amount: number;
}

export class CreateVaultParameters {
  @IsNotEmpty()
  @IsString()
  address: string;
}

export class VaultParameters {
  @IsNotEmpty()
  @IsString()
  address: string;

  @IsNotEmpty()
  @IsString()
  vault: string;
}

export class DepositToVaultParameters extends VaultParameters {
  @IsPositive()
  amount: number;

  @IsString()
  token: string;
}

export class WithdrawFromVaultParameters extends VaultParameters {
  @IsPositive()
  amount: number;

  @IsString()
  token: string;
}

export class TakeLoanParameters extends VaultParameters {
  @IsPositive()
  amount: number;
}

export class PaybackLoanParameters extends VaultParameters {
  @IsPositive()
  amount: number;
}

export class AddPoolLiquidityParameters {
  @IsNotEmpty()
  @IsString()
  address: string;

  @IsPositive()
  partAAmount: number;

  @IsPositive()
  partBAmount: number;
}

export class RemovePoolLiquidityParameters {
  @IsNotEmpty()
  @IsString()
  address: string;

  @IsPositive()
  amount: number;
}

export class CompositeSwapParameters {
  @IsNotEmpty()
  @IsString()
  address: string;

  @IsNotEmpty()
  @IsString()
  fromToken: string;

  @IsPositive()
  amount: number;

  @IsNotEmpty()
  @IsString()
  toToken: string;
}

export type TransactionInput =
  | { command: TransactionCommand.ACCOUNT_TO_ACCOUNT; parameters: SendTokenParameters }
  | { command: TransactionCommand.CREATE_VAULT; parameters: CreateVaultParameters }
  | { command: TransactionCommand.DEPOSIT_TO_VAULT; parameters: DepositToVaultParameters }
  | { command: TransactionCommand.WITHDRAW_FROM_VAULT; parameters: WithdrawFromVaultParameters }
  | { command: TransactionCommand.TAKE_LOAN; parameters: TakeLoanParameters }
  | { command: TransactionCommand.PAYBACK_LOAN; parameters: PaybackLoanParameters }
  | { command: TransactionCommand.POOL_ADD_LIQUIDITY; parameters: AddPoolLiquidityParameters }
  | { command: TransactionCommand.POOL_REMOVE_LIQUIDITY; parameters: RemovePoolLiquidityParameters }
  | { command: TransactionCommand.COMPOSITE_SWAP; parameters: CompositeSwapParameters };
