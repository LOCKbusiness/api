import { BadRequestException } from '@nestjs/common';
import { Asset } from 'src/shared/entities/asset.entity';
import { IEntity } from 'src/shared/entities/entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { BlockchainAddress } from '../../../../shared/entities/blockchain-address.entity';
import { DepositStatus, StakingAddressPurposes } from '../enums';
import { Staking } from './staking.entity';

@Entity()
export class Deposit extends IEntity {
  @ManyToOne(() => Staking, (staking) => staking.deposits, { eager: true, nullable: true })
  staking: Staking;

  @Column({ length: 256, nullable: false })
  status: DepositStatus;

  @ManyToOne(() => Asset, { eager: true, nullable: false })
  asset: Asset;

  @Column({ type: 'float', nullable: false, default: 0 })
  amount: number;

  @ManyToOne(() => BlockchainAddress, { eager: true, nullable: false })
  address: BlockchainAddress<StakingAddressPurposes.DEPOSIT>;

  @Column({ length: 256, nullable: false })
  txId: string;

  //*** FACTORY METHODS ***//

  static create(
    staking: Staking,
    asset: Asset,
    amount: number,
    address: BlockchainAddress<StakingAddressPurposes.DEPOSIT>,
    txId: string,
  ): Deposit {
    if (!txId) throw new BadRequestException('TxID must be provided when creating a staking deposit');

    const deposit = new Deposit();

    deposit.staking = staking;
    deposit.status = DepositStatus.PENDING;
    deposit.asset = asset;
    deposit.address = address;
    deposit.amount = amount;
    deposit.txId = txId;

    return deposit;
  }

  //*** PUBLIC API ***//

  confirmDeposit(): this {
    this.status = DepositStatus.CONFIRMED;

    return this;
  }
}
