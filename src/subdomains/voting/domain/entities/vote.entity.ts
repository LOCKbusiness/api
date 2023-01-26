import { Masternode } from 'src/integration/masternode/domain/entities/masternode.entity';
import { IEntity } from 'src/shared/models/entity';
import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { Vote as VoteEnum } from '../enums';

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
  decision: VoteEnum;

  @Column({ nullable: true })
  txId: string;
}
