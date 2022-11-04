import { IsEnum, IsNotEmpty, IsNotEmptyObject, IsObject } from 'class-validator';
import { TransactionCommand } from '../../domain/enums';

export class TransactionInputDto {
  @IsNotEmpty()
  @IsEnum(TransactionCommand)
  command: TransactionCommand;

  @IsNotEmptyObject()
  @IsObject()
  parameters: any;
}

export interface SendTokenParameters {
  from: string;
  to: string;
  token: string;
  amount: number;
}

export interface CreateVaultParameters {
  address: string;
}

export interface VaultParameters {
  address: string;
  vault: string;
}

export interface DepositToVaultParameters extends VaultParameters {
  amount: number;
}

export interface WithdrawFromVaultParameters extends VaultParameters {
  amount: number;
}

export interface TakeLoanParameters extends VaultParameters {
  amount: number;
}

export interface PaybackLoanParameters extends VaultParameters {
  amount: number;
}

export interface AddPoolLiquidityParameters {
  address: string;
  partAAmount: number;
  partBAmount: number;
}

export interface RemovePoolLiquidityParameters {
  address: string;
  amount: number;
}

export interface CompositeSwapParameters {
  address: string;
  fromToken: string;
  amount: number;
  toToken: string;
}
