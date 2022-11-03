import { IEntity } from 'src/shared/models/entity';
import { Column, Entity } from 'typeorm';

@Entity()
export class Vault extends IEntity {
  @Column({ nullable: false })
  wallet: string;

  @Column({ nullable: false })
  accountIndex: number;

  @Column({ nullable: false })
  address: string;

  @Column({ nullable: false })
  vault: string;

  @Column({ nullable: false })
  blockchainPairId: number;

  @Column({ nullable: false })
  blockchainPairTokenAId: number;

  @Column({ nullable: false })
  blockchainPairTokenBId: number;

  @Column({ nullable: false })
  minCollateralRatio: number;

  @Column({ nullable: false })
  maxCollateralRatio: number;
}
