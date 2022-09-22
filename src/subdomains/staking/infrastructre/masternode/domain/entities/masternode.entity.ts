import { IEntity } from 'src/shared/entities/entity';
import { Column, Entity, Index } from 'typeorm';
import { MasternodeState } from '../../../../domain/enums';

@Entity()
export class Masternode extends IEntity {
  @Column({ length: 256 })
  server: string;

  @Column({ length: 256, unique: true })
  operator: string;

  @Column({ length: 256, nullable: true })
  @Index({ unique: true, where: 'owner IS NOT NULL' })
  owner: string;

  @Column({ length: 256, nullable: true })
  ownerWallet: string;

  @Column({ type: 'integer', nullable: true })
  timeLock: number;

  @Column({ type: 'datetime2', nullable: true })
  creationDate: Date;

  @Column({ length: 256, nullable: true })
  @Index({ unique: true, where: 'creationHash IS NOT NULL' })
  creationHash: string;

  @Column({ type: 'datetime2', nullable: true })
  resignDate: Date;

  @Column({ length: 256, nullable: true })
  @Index({ unique: true, where: 'resignHash IS NOT NULL' })
  resignHash: string;

  @Column({ length: 256, nullable: true })
  signatureLiquidityManager: string;

  @Column({ length: 256, nullable: true })
  signaturePayoutManager: string;

  @Column({ default: MasternodeState.IDLE, nullable: false })
  state: MasternodeState;

  @Column({ default: false })
  creationFeePaid: boolean;
}
