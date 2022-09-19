import { BlockchainAddress } from '../../../../shared/entities/blockchain-address.entity';
import { StakingAddressPurposes } from '../enums';

export class Withdrawal {
  blockchainAddress: BlockchainAddress<StakingAddressPurposes.WITHDRAWAL>;
}
