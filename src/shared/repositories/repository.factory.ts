import { Injectable } from '@nestjs/common';
import { MasternodeRepository } from 'src/integration/masternode/application/repositories/masternode.repository';
import { ReservableBlockchainAddressRepository } from 'src/subdomains/address-pool/application/repositories/reservable-blockchain-address.repository';
import { StakingAnalyticsRepository } from 'src/subdomains/analytics/application/repositories/staking-analytics.repository';
import { DepositRepository } from 'src/subdomains/staking/application/repositories/deposit.repository';
import { RewardRepository } from 'src/subdomains/staking/application/repositories/reward.repository';
import { StakingRepository } from 'src/subdomains/staking/application/repositories/staking.repository';
import { WithdrawalRepository } from 'src/subdomains/staking/application/repositories/withdrawal.repository';
import { WalletRepository } from 'src/subdomains/user/application/repositories/wallet.repository';
import { EntityManager } from 'typeorm';

@Injectable()
export class RepositoryFactory {
  public readonly staking: StakingRepository;
  public readonly deposit: DepositRepository;
  public readonly withdrawal: WithdrawalRepository;
  public readonly reward: RewardRepository;
  public readonly analytics: StakingAnalyticsRepository;
  public readonly masternode: MasternodeRepository;
  public readonly reservableBlockchainAddress: ReservableBlockchainAddressRepository;
  public readonly wallet: WalletRepository;

  constructor(manager: EntityManager) {
    this.staking = new StakingRepository(manager);
    this.deposit = new DepositRepository(manager);
    this.withdrawal = new WithdrawalRepository(manager);
    this.reward = new RewardRepository(manager);
    this.analytics = new StakingAnalyticsRepository(manager);
    this.masternode = new MasternodeRepository(manager);
    this.reservableBlockchainAddress = new ReservableBlockchainAddressRepository(manager);
    this.wallet = new WalletRepository(manager);
  }
}
