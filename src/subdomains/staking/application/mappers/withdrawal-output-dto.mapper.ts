import { Withdrawal } from '../../domain/entities/withdrawal.entity';
import { WithdrawalOutputDto } from '../dto/output/withdrawal.output.dto';

export class WithdrawalOutputDtoMapper {
  static entityToDto(withdrawal: Withdrawal): WithdrawalOutputDto {
    const dto = new WithdrawalOutputDto();

    dto.id = withdrawal.id;
    dto.signMessage = withdrawal.signMessage;
    dto.signature = withdrawal.signature;
    dto.asset = withdrawal.asset.name;
    dto.amount = withdrawal.amount;

    return dto;
  }
}
