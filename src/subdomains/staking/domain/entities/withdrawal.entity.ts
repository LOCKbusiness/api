import { Config } from 'src/config/config';
import { Asset } from 'src/shared/models/asset/asset.entity';
import { IEntity } from 'src/shared/models/entity';
import { Util } from 'src/shared/util';
import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { WithdrawalStatus } from '../enums';
import { Staking } from './staking.entity';

@Entity()
@Index(['staking', 'status'], { unique: true, where: `status = '${WithdrawalStatus.DRAFT}'` })
export class Withdrawal extends IEntity {
  @Column({ nullable: true })
  signMessage: string;

  @Column({ nullable: true })
  signature: string;

  @ManyToOne(() => Staking, (staking) => staking.withdrawals, { nullable: true })
  staking: Staking;

  @Column({ nullable: false })
  status: WithdrawalStatus;

  @ManyToOne(() => Asset, { eager: true, nullable: false })
  asset: Asset;

  @Column({ type: 'float', nullable: false, default: 0 })
  amount: number;

  @Column({ type: 'datetime2', nullable: true })
  outputDate: Date;

  @Column({ nullable: true })
  withdrawalTxId: string;

  //*** FACTORY METHODS ***//

  static create(staking: Staking, amount: number): Withdrawal {
    const withdrawal = new Withdrawal();

    withdrawal.staking = staking;
    withdrawal.status = WithdrawalStatus.DRAFT;
    withdrawal.asset = staking.asset;
    withdrawal.amount = amount;

    return withdrawal;
  }

  //*** PUBLIC API ***//

  // should be called after draft saved to DB and withdrawal receives an ID
  setSignMessage(): this {
    this.signMessage = this.generateWithdrawalSignatureMessage(
      this.amount,
      this.staking.asset.name,
      this.staking.withdrawalAddress.address,
      this.staking.id,
      this.id,
    );

    return this;
  }

  signWithdrawal(signature: string): this {
    this.signature = signature;
    this.status = WithdrawalStatus.PENDING;

    return this;
  }

  designateWithdrawalPayout(withdrawalTxId: string): this {
    this.status = WithdrawalStatus.PAYING_OUT;
    this.withdrawalTxId = withdrawalTxId;

    return this;
  }

  confirmWithdrawal(): this {
    this.status = WithdrawalStatus.CONFIRMED;

    this.outputDate = new Date();

    return this;
  }

  //*** HELPER METHODS ***//

  private generateWithdrawalSignatureMessage(
    amount: number,
    asset: string,
    address: string,
    stakingId: number,
    withdrawalId: number,
  ): string {
    return Util.template(Config.staking.signatureTemplates.signWithdrawalMessage, {
      amount: amount.toString(),
      asset,
      address,
      stakingId: stakingId.toString(),
      withdrawalId: withdrawalId.toString(),
    });
  }
}
