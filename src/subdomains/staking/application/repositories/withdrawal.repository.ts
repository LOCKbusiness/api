import { EntityRepository, Repository } from 'typeorm';
import { Withdrawal } from '../../domain/entities/withdrawal.entity';
import { WithdrawalStatus } from '../../domain/enums';

@EntityRepository(Withdrawal)
export class WithdrawalRepository extends Repository<Withdrawal> {
  async getPending(): Promise<Withdrawal[]> {
    return this.find({ where: { status: WithdrawalStatus.PENDING }, relations: ['asset'] });
  }
}
