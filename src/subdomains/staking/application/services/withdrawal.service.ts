import { Injectable } from '@nestjs/common';
import { Withdrawal } from '../../domain/entities/withdrawal.entity';
import { WithdrawalOutputDto } from '../dto/output/withdrawal.output.dto';
import { WithdrawalRepository } from '../repositories/withdrawal.repository';

@Injectable()
export class WithdrawalService {
  constructor(private readonly repository: WithdrawalRepository) {}

  async getPendingWithdrawals(): Promise<WithdrawalOutputDto[]> {
    return this.repository.getPending().then(this.toOutputDto);
  }

  private toOutputDto(input: Withdrawal[]): WithdrawalOutputDto[] {
    return input.map((w) => {
      return { id: w.id, signMessage: w.signMessage, signature: w.signature, asset: w.asset, amount: w.amount };
    });
  }
}
