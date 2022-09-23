import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { Column } from 'typeorm';
import { IEntity } from './entity';

export abstract class BlockchainAddress extends IEntity {
  @Column({ nullable: false })
  address: string;

  @Column({ nullable: false })
  blockchain: Blockchain;
}
