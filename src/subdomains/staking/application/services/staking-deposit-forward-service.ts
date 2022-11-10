import { JellyfishWallet, WalletHdNode } from '@defichain/jellyfish-wallet';
import { WhaleWalletAccount } from '@defichain/whale-api-wallet';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { JellyfishService } from 'src/blockchain/ain/jellyfish/jellyfish.service';
import { NodeClient } from 'src/blockchain/ain/node/node-client';
import { NodeService, NodeType } from 'src/blockchain/ain/node/node.service';
import { TokenProviderService } from 'src/blockchain/ain/whale/token-provider.service';
import { WhaleClient } from 'src/blockchain/ain/whale/whale-client';
import { WhaleService } from 'src/blockchain/ain/whale/whale.service';
import { Config } from 'src/config/config';
import { Asset } from 'src/shared/models/asset/asset.entity';
import { Deposit } from '../../domain/entities/deposit.entity';
import { StakingBlockchainAddress } from '../../domain/entities/staking-blockchain-address.entity';
import { DepositStatus, StakingStrategy } from '../../domain/enums';
import { StakingDeFiChainService } from '../../infrastructure/staking-defichain.service';
import { StakingRepository } from '../repositories/staking.repository';

@Injectable()
export class StakingDepositForwardService {
  private wallet: JellyfishWallet<WhaleWalletAccount, WalletHdNode>;
  private whaleClient: WhaleClient;
  private nodeClient: NodeClient;

  constructor(
    private readonly repository: StakingRepository,
    private readonly deFiChainStakingService: StakingDeFiChainService,
    private readonly jellyfishService: JellyfishService,
    private readonly tokenProviderService: TokenProviderService,
    whaleService: WhaleService,
    nodeService: NodeService,
  ) {
    whaleService.getClient().subscribe((client) => (this.whaleClient = client));
    nodeService.getConnectedNode(NodeType.INPUT).subscribe((client) => (this.nodeClient = client));
    this.wallet = this.jellyfishService.createWallet(Config.payIn.forward.phrase);
  }

  async forwardDepositsToStaking(): Promise<void> {
    await this.deFiChainStakingService.checkSync();

    // not querying Stakings, because eager query is not supported, thus unsafe to fetch entire entity
    const stakingIdsWithPendingDeposits = await this.repository
      .createQueryBuilder('staking')
      .leftJoin('staking.deposits', 'deposits')
      .where('deposits.status = :status', { status: DepositStatus.PENDING })
      .getMany()
      .then((s) => s.map((i) => i.id));

    for (const stakingId of stakingIdsWithPendingDeposits) {
      await this.processPendingDepositsForStaking(stakingId);
    }
  }

  private async processPendingDepositsForStaking(stakingId: number): Promise<void> {
    const staking = await this.repository.findOne(stakingId);
    const deposits = staking.getPendingDeposits();

    for (const deposit of deposits) {
      try {
        const txId = await this.forwardDepositToStaking(deposit, staking.depositAddress, staking.strategy);
        staking.confirmDeposit(deposit.id.toString(), txId);

        await this.repository.save(staking);
      } catch (e) {
        console.error(`Failed to forward deposit ${deposit.id}:`, e);
      }
    }
  }

  private async forwardDepositToStaking(
    deposit: Deposit,
    depositAddress: StakingBlockchainAddress,
    strategy: StakingStrategy,
  ): Promise<string> {
    switch (strategy) {
      case StakingStrategy.MASTERNODE:
        return this.deFiChainStakingService.forwardDeposit(depositAddress.address, deposit.amount);
      case StakingStrategy.LIQUIDITY_MINING:
        return this.forwardDeposit(depositAddress.address, deposit.amount, deposit.asset);
    }
  }

  private async forwardDeposit(address: string, amount: number, asset: Asset): Promise<string> {
    const forwardAccount = this.wallet.get(0);
    const sendUtxosToDeposit = await this.jellyfishService.rawTxForSendFromTo(
      await forwardAccount.getAddress(),
      address,
      new BigNumber(Config.payIn.forward.accountToAccountFee),
      false,
    );
    const signedSendUtxosHex = await this.jellyfishService.signRawTx(sendUtxosToDeposit, forwardAccount);
    const txSendUtxosId = await this.whaleClient.sendRaw(signedSendUtxosHex);
    console.info(`sent ${txSendUtxosId}, now waiting for blockchain...`);
    await this.whaleClient.waitForTx(txSendUtxosId, Config.payIn.forward.timeout);
    console.info(`... completed`);
    const token = await this.tokenProviderService.get(asset.name);
    const forwardToLiq = await this.jellyfishService.rawTxForForwardAccountToLiq(
      address,
      +token.id,
      new BigNumber(amount),
    );
    const signedForwardToLiq = await this.nodeClient.signTx(forwardToLiq.hex);
    console.info(`sending ${forwardToLiq.id}...`);
    return await this.nodeClient.sendRawTx(signedForwardToLiq.hex);
  }
}
