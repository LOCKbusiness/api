import { Withdrawal } from '../../domain/entities/withdrawal.entity';
import { WithdrawalDraftOutputDto } from '../dto/output/withdrawal-draft.output.dto';

export class WithdrawalDraftOutputDtoMapper {
  static entityToDto(withdrawal: Withdrawal): WithdrawalDraftOutputDto {
    const dto = new WithdrawalDraftOutputDto();

    dto.id = withdrawal.id;
    dto.signMessage = withdrawal.signMessage;

    return dto;
  }
}
