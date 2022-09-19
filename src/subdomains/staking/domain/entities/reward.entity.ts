import { Asset } from 'src/shared/entities/asset.entity';
import { BlockchainAddress } from '../../../../shared/entities/blockchain-address.entity';
import { RewardStatus, StakingAddressPurposes } from '../enums';

export class Reward {
  status: RewardStatus;
  asset: Asset;
  amount: number;

  reinvestShare: number;
  reinvestAsset: Asset;
  reinvestAmount: Asset;

  payoutShare: number;
  payoutAsset: Asset;
  payoutAmount: number;

  blockchainAddress: BlockchainAddress<StakingAddressPurposes.REWARD_PAYOUT>;
}
