import { Lock } from 'src/shared/lock';
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Config, Process } from 'src/config/config';
import { Util } from 'src/shared/util';
import { MasternodeService } from 'src/integration/masternode/application/services/masternode.service';
import { StakingWithdrawalService } from './staking-withdrawal.service';
import BigNumber from 'bignumber.js';
import { MasternodeState, MasternodeTimeLock } from '../../domain/enums';
import { MasternodeState as BlockchainMasternodeState } from '@defichain/jellyfish-api-core/dist/category/masternode';
import { Masternode } from 'src/integration/masternode/domain/entities/masternode.entity';
import { TransactionExecutionService } from 'src/integration/transaction/application/services/transaction-execution.service';
import { WhaleClient } from 'src/blockchain/ain/whale/whale-client';
import { WhaleService } from 'src/blockchain/ain/whale/whale.service';
import { UtxoSizePriority } from 'src/blockchain/ain/jellyfish/domain/enums';
import { AssetService } from 'src/shared/services/asset.service';

@Injectable()
export class LiquidityManagementService {
  private client: WhaleClient;

  constructor(
    private readonly assetService: AssetService,
    private readonly masternodeService: MasternodeService,
    private readonly withdrawalService: StakingWithdrawalService,
    private readonly transactionExecutionService: TransactionExecutionService,
    whaleService: WhaleService,
  ) {
    whaleService.getClient().subscribe((c) => (this.client = c));
  }

  @Cron(CronExpression.EVERY_MINUTE)
  @Lock(1800)
  async doTasks() {
    if (Config.processDisabled(Process.STAKING_LIQUIDITY_MANAGEMENT)) return;

    await this.checkMasternodesInProcess();
    await this.checkLiquidity();
  }

  // --- LIQUIDITY MANAGEMENT --- //

  private masternodeChange = {
    count: 0,
    updated: new Date(),
  };

  async checkLiquidity(): Promise<void> {
    const excessiveLiquidity = await this.getExcessiveLiquidity();

    const masternodeChangeCount = excessiveLiquidity.gt(0)
      ? Math.floor(excessiveLiquidity.div(Config.masternode.collateral + Config.masternode.fee).toNumber())
      : Math.floor(excessiveLiquidity.div(Config.masternode.collateral).toNumber());

    // only apply masternode change if the required change has been constant for a while
    if (masternodeChangeCount !== this.masternodeChange.count) {
      console.info(`Masternode change count changed from ${this.masternodeChange.count} to ${masternodeChangeCount}`);
      this.masternodeChange.count = masternodeChangeCount;
      this.masternodeChange.updated = new Date();
      return;
    }

    if (Util.secondsDiff(this.masternodeChange.updated, new Date()) < Config.staking.liquidity.minChangePeriod) return;

    // reset
    this.masternodeChange.count = 0;
    this.masternodeChange.updated = new Date();

    if (masternodeChangeCount > 0) {
      console.info(`Building ${masternodeChangeCount} masternodes`);
      await this.startMasternodeEnabling(masternodeChangeCount);
    } else if (masternodeChangeCount < 0) {
      console.info(`Resigning ${-masternodeChangeCount} masternodes`);
      await this.startMasternodeResigning(-masternodeChangeCount);
    }
  }

  private async getExcessiveLiquidity(): Promise<BigNumber> {
    const { available, incoming } = await this.getCurrentLiquidity();

    const upperBoundExcessLiq = available.minus(Config.staking.liquidity.max);
    const lowerBoundExcessLiq = available.plus(incoming).minus(Config.staking.liquidity.min);

    if (upperBoundExcessLiq.gt(0)) return upperBoundExcessLiq;
    if (lowerBoundExcessLiq.lt(0)) return lowerBoundExcessLiq;

    return new BigNumber(0);
  }

  private async getCurrentLiquidity(): Promise<{ available: BigNumber; incoming: BigNumber }> {
    const balance = await this.client.getUtxoBalance(Config.staking.liquidity.address);

    const dfi = await this.assetService.getDfiCoin();
    const pendingWithdrawalAmount = await this.withdrawalService.getPendingAmount(dfi);

    const resigningMasternodes = await this.masternodeService.getAllResigning();
    const pendingResignAmount = new BigNumber(resigningMasternodes.length * Config.masternode.collateral);

    return { available: balance.minus(pendingWithdrawalAmount), incoming: pendingResignAmount };
  }

  // --- MASTERNODES ---- //

  private async checkMasternodesInProcess(): Promise<void> {
    const allInProcessMasternodes = await this.masternodeService.getAllWithStates([
      MasternodeState.ENABLING,
      MasternodeState.RESIGNING,
      MasternodeState.PRE_ENABLED,
      MasternodeState.PRE_RESIGNED,
      MasternodeState.MOVING_COLLATERAL,
    ]);
    await this.handleMasternodesWithState(allInProcessMasternodes, MasternodeState.ENABLING);
    await this.handleMasternodesWithState(allInProcessMasternodes, MasternodeState.RESIGNING);
    await this.handleMasternodesWithState(
      allInProcessMasternodes,
      MasternodeState.PRE_ENABLED,
      BlockchainMasternodeState.ENABLED,
    );
    await this.handleMasternodesWithState(
      allInProcessMasternodes,
      MasternodeState.PRE_RESIGNED,
      BlockchainMasternodeState.RESIGNED,
    );
    await this.handleMasternodesWithState(allInProcessMasternodes, MasternodeState.MOVING_COLLATERAL);
  }

  private async startMasternodeEnabling(count: number, timeLock = MasternodeTimeLock.NONE): Promise<void | void[]> {
    // get n addresses from the masternode table, where masternode state is idle
    let idleMasternodes = await this.masternodeService.getIdleMasternodes(count);
    const newOwners = await this.masternodeService.getNewOwners(count);
    idleMasternodes = await this.masternodeService.assignOwnersToMasternodes(newOwners, idleMasternodes, timeLock);
    return this.handleMasternodesWithState(idleMasternodes, MasternodeState.IDLE);
  }

  private async startMasternodeResigning(count: number): Promise<void | void[]> {
    const masternodes = await this.masternodeService.getOrderedForResigning();
    return this.handleMasternodesWithState(masternodes.splice(0, count), MasternodeState.ENABLED);
  }

  private async handleMasternodesWithState(
    masternodes: Masternode[],
    state: MasternodeState,
    blockchainState?: BlockchainMasternodeState,
  ): Promise<void | void[]> {
    let filteredMasternodes = masternodes.filter((mn) => mn.state === state);

    if (blockchainState) {
      filteredMasternodes = await this.masternodeService.filterByBlockchainState(filteredMasternodes, blockchainState);
    }
    if (filteredMasternodes.length > 0)
      console.info(`${filteredMasternodes.length} masternodes in state ${state} will be processed now`);

    const process = this.getProcessFunctionsFor(state);

    return Promise.all(
      filteredMasternodes.map((node) =>
        process
          .txFunc(node)
          .then((value: string) => process.updateFunc(node, value)) // value can be txId or balance
          .catch((e) => console.error(`Masternode state update failed for ${node.owner} (${node.state}):`, e)),
      ),
    );
  }

  private getProcessFunctionsFor(state: MasternodeState): {
    txFunc: (masternode: Masternode) => Promise<string>;
    updateFunc: (masternode: Masternode, txId: string) => Promise<void>;
  } {
    switch (state) {
      case MasternodeState.IDLE:
        return {
          txFunc: (masternode: Masternode) => {
            return this.transactionExecutionService.sendFromLiq({
              to: masternode.owner,
              amount: new BigNumber(
                Config.masternode.collateral + Config.masternode.fee + Config.masternode.creationFee,
              ),
              ownerWallet: Config.staking.liquidity.wallet,
              accountIndex: Config.staking.liquidity.account,
              sizePriority: UtxoSizePriority.BIG,
            });
          },
          updateFunc: (masternode: Masternode) => {
            return this.masternodeService.enabling(
              masternode.id,
              masternode.owner,
              masternode.ownerWallet,
              masternode.timeLock,
              masternode.accountIndex,
            );
          },
        };
      case MasternodeState.ENABLING:
        return {
          txFunc: (masternode: Masternode) => {
            return this.transactionExecutionService.createMasternode({
              masternode,
              ownerWallet: masternode.ownerWallet,
              accountIndex: masternode.accountIndex,
            });
          },
          updateFunc: (masternode: Masternode, txId: string) => {
            return this.masternodeService.preEnabled(masternode.id, txId);
          },
        };
      case MasternodeState.PRE_ENABLED:
        return {
          txFunc: () => {
            return Promise.resolve('');
          },
          updateFunc: (masternode: Masternode) => {
            return this.masternodeService.enabled(masternode.id);
          },
        };
      case MasternodeState.ENABLED:
        return {
          txFunc: (masternode: Masternode) => {
            return this.transactionExecutionService.sendFromLiq({
              to: masternode.owner,
              amount: new BigNumber(Config.masternode.resignFee),
              ownerWallet: Config.staking.liquidity.wallet,
              accountIndex: Config.staking.liquidity.account,
              sizePriority: UtxoSizePriority.SMALL,
            });
          },
          updateFunc: (masternode: Masternode) => {
            return this.masternodeService.resigning(masternode.id);
          },
        };
      case MasternodeState.RESIGNING:
        return {
          txFunc: (masternode: Masternode) => {
            return this.transactionExecutionService.resignMasternode({
              masternode,
              ownerWallet: masternode.ownerWallet,
              accountIndex: masternode.accountIndex,
            });
          },
          updateFunc: (masternode: Masternode, txId: string) => {
            return this.masternodeService.preResigned(masternode.id, txId);
          },
        };
      case MasternodeState.PRE_RESIGNED:
        return {
          txFunc: (masternode: Masternode) => {
            return this.transactionExecutionService.sendToLiq({
              from: masternode.owner,
              amount: new BigNumber(Config.masternode.collateral),
              ownerWallet: masternode.ownerWallet,
              accountIndex: masternode.accountIndex,
            });
          },
          updateFunc: (masternode: Masternode) => {
            return this.masternodeService.movingCollateral(masternode.id);
          },
        };
      case MasternodeState.MOVING_COLLATERAL:
        return {
          txFunc: (masternode: Masternode) => {
            return this.client.getUtxoBalance(masternode.owner).then((balance) => balance.toString());
          },
          updateFunc: (masternode: Masternode, balance: string) => {
            if (new BigNumber(balance).gt(0.1)) return;
            return this.masternodeService.resigned(masternode.id);
          },
        };
    }
  }
}
