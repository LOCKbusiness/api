import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { Column } from 'typeorm';
import { IEntity } from './entity';

export abstract class BlockchainAddress extends IEntity {
  @Column({ length: 256, nullable: false })
  address: string;

  @Column({ length: 256, nullable: false })
  blockchain: Blockchain;
}
