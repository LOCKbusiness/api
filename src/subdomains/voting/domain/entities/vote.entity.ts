import { Masternode } from 'src/integration/masternode/domain/entities/masternode.entity';
import { IEntity } from 'src/shared/models/entity';
import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { VoteDecision, VoteStatus } from '../enums';

@Entity()
@Index((v: Vote) => [v.masternode, v.proposalId], { unique: true })
export class Vote extends IEntity {
  @ManyToOne(() => Masternode, { nullable: false, eager: true })
  masternode: Masternode;

  @Column()
  proposalId: string;

  @Column()
  proposalName: string;

  @Column()
  decision: VoteDecision;

  @Column({ nullable: true })
  txId: string;

  @Column({ nullable: false, default: VoteStatus.CREATED })
  status: VoteStatus;
}
