import { IEntity } from 'src/shared/models/entity';
import { Column, Entity, Index } from 'typeorm';
import { MasternodeState, MasternodeTimeLock } from '../../../../subdomains/staking/domain/enums';

@Entity()
export class Masternode extends IEntity {
  @Column()
  server: string;

  @Column({ unique: true })
  operator: string;

  @Column({ type: 'integer', nullable: true })
  accountIndex: number;

  @Column({ nullable: true })
  @Index({ unique: true, where: 'owner IS NOT NULL' })
  owner: string;

  @Column({ nullable: true })
  ownerWallet: string;

  @Column({ nullable: true })
  timeLock: MasternodeTimeLock;

  @Column({ type: 'datetime2', nullable: true })
  creationDate: Date;

  @Column({ nullable: true })
  @Index({ unique: true, where: 'creationHash IS NOT NULL' })
  creationHash: string;

  @Column({ type: 'datetime2', nullable: true })
  resignDate: Date;

  @Column({ nullable: true })
  @Index({ unique: true, where: 'resignHash IS NOT NULL' })
  resignHash: string;

  @Column({ default: MasternodeState.IDLE, nullable: false })
  state: MasternodeState;

  @Column({ default: false })
  creationFeePaid: boolean;
}
