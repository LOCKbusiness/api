import { Asset } from 'src/shared/entities/asset.entity';
import { BlockchainAddress } from '../../../../shared/entities/blockchain-address.entity';
import { StakingAddressPurposes } from '../enums';

export class Deposit {
  asset: Asset;
  amount: number;
  blockchainAddress: BlockchainAddress<StakingAddressPurposes.DEPOSIT>;
}
