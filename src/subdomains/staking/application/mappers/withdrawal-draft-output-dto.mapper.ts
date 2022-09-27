import { Withdrawal } from '../../domain/entities/withdrawal.entity';
import { WithdrawalDraftOutputDto } from '../dto/output/withdrawal-draft.output.dto';

export class WithdrawalDraftOutputDtoMapper {
  static entityToDto(withdrawalDraft: Withdrawal): WithdrawalDraftOutputDto {
    const dto = new WithdrawalDraftOutputDto();

    dto.id = withdrawalDraft.id;
    dto.signMessage = withdrawalDraft.signMessage;

    return dto;
  }
}
