import { IEntity } from 'src/shared/models/entity';
import { Column, Entity } from 'typeorm';

@Entity()
export class Vault extends IEntity {
  @Column({ nullable: false })
  wallet: string;

  @Column({ type: 'integer', nullable: false })
  accountIndex: number;

  @Column({ nullable: false })
  address: string;

  @Column({ nullable: false })
  vault: string;

  @Column({ type: 'integer', nullable: false })
  blockchainPairId: number;

  @Column({ type: 'integer', nullable: false })
  blockchainPairTokenAId: number;

  @Column({ type: 'integer', nullable: false })
  blockchainPairTokenBId: number;

  @Column({ type: 'integer', nullable: false })
  minCollateralRatio: number;

  @Column({ type: 'integer', nullable: false })
  maxCollateralRatio: number;
}
