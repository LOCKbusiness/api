import { Asset } from 'src/shared/entities/asset.entity';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { BlockchainAddress } from '../../../../shared/entities/blockchain-address.entity';
import { Deposit } from './deposit.entity';
import { Reward } from './reward.entity';
import { Withdrawal } from './withdrawal.entity';
import { Entity } from 'typeorm';
import { IEntity } from 'src/shared/entities/entity';
import { StakingAddressPurposes } from '../enums';

@Entity()
export class Staking extends IEntity {
  asset: Asset;
  balance: number;
  deposits: Deposit[];
  withdrawals: Withdrawal[];
  rewards: Reward[];

  // ???
  defaultAddresses: BlockchainAddress<StakingAddressPurposes>[];

  static create(): Staking {
    const stake = new Staking();

    stake.defaultAddresses.push(
      BlockchainAddress.create('address', Blockchain.DEFICHAIN, StakingAddressPurposes.DEPOSIT),
    );

    return stake;
  }

  deposit(): this {
    return this;
  }

  withdraw(): this {
    return this;
  }

  addReward(): this {
    return this;
  }

  distributeReward(): this {
    return this;
  }
}
