import { IsEnum, IsNotEmpty, IsNotEmptyObject, IsObject } from 'class-validator';
import { TransactionCommand } from '../../domain/enums';

export class TransactionInputDto {
  @IsNotEmpty()
  @IsEnum(TransactionCommand)
  command: TransactionCommand;

  @IsNotEmptyObject()
  @IsObject()
  parameters: unknown;
}
