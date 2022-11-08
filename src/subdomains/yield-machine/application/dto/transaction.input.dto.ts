import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, ValidateNested } from 'class-validator';
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
} from './transaction-parameters.dto';

export class TransactionInputDto {
  @IsNotEmpty()
  @IsEnum(TransactionCommand)
  command: TransactionCommand;

  @IsNotEmpty()
  @ValidateNested()
  @Type(({ object }) => {
    switch ((object as TransactionInputDto).command) {
      case TransactionCommand.ACCOUNT_TO_ACCOUNT:
        return SendTokenParameters;
      case TransactionCommand.CREATE_VAULT:
        return CreateVaultParameters;
      case TransactionCommand.DEPOSIT_TO_VAULT:
        return DepositToVaultParameters;
      case TransactionCommand.WITHDRAW_FROM_VAULT:
        return WithdrawFromVaultParameters;
      case TransactionCommand.TAKE_LOAN:
        return TakeLoanParameters;
      case TransactionCommand.PAYBACK_LOAN:
        return PaybackLoanParameters;
      case TransactionCommand.POOL_ADD_LIQUIDITY:
        return AddPoolLiquidityParameters;
      case TransactionCommand.POOL_REMOVE_LIQUIDITY:
        return RemovePoolLiquidityParameters;
      case TransactionCommand.COMPOSITE_SWAP:
        return CompositeSwapParameters;
    }
  })
  parameters: any;
}
