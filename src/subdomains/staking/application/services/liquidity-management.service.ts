import { Lock } from 'src/shared/lock';
import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Config } from 'src/config/config';
import { Util } from 'src/shared/util';
import { MasternodeService } from 'src/integration/masternode/application/services/masternode.service';
import { StakingWithdrawalService } from './staking-withdrawal.service';
import { Withdrawal } from '../../domain/entities/withdrawal.entity';
import BigNumber from 'bignumber.js';
import { MasternodeState, MasternodeTimeLock } from '../../domain/enums';
import { MasternodeState as BlockchainMasternodeState } from '@defichain/jellyfish-api-core/dist/category/masternode';
import { Masternode } from 'src/integration/masternode/domain/entities/masternode.entity';
import { TransactionExecutionService } from 'src/integration/transaction/application/services/transaction-execution.service';
import { WhaleClient } from 'src/blockchain/ain/whale/whale-client';
import { WhaleService } from 'src/blockchain/ain/whale/whale.service';

@Injectable()
export class LiquidityManagementService {
  private readonly lockWithdrawals = new Lock(1800);
  private readonly lockMasternodes = new Lock(1800);

  private client: WhaleClient;

  constructor(
    private readonly masternodeService: MasternodeService,
    private readonly withdrawalService: StakingWithdrawalService,
    private readonly transactionCreationService: TransactionExecutionService,
    whaleService: WhaleService,
  ) {
    whaleService.getClient().subscribe((c) => (this.client = c));
  }

  @Interval(300000)
  async doWithdrawalsTasks() {
    if (!this.lockWithdrawals.acquire()) return;

    try {
      await this.prepareWithdrawals();
    } catch (e) {
      console.error(`Exception during withdrawals cronjob: ${e}`);
    }

    this.lockWithdrawals.release();
  }

  @Interval(300000)
  async doMasternodesTasks() {
    if (!this.lockMasternodes.acquire()) return;

    try {
      await this.checkMasternodesInProcess();
      await this.checkLiquidity();
    } catch (e) {
      console.error(`Exception during masternodes cronjob: ${e}`);
    }

    this.lockMasternodes.release();
  }

  async checkLiquidity(): Promise<void> {
    const excessiveLiquidity = await this.getExcessiveLiquidity();

    const masternodeChangeCount = excessiveLiquidity.gt(0)
      ? Math.floor(excessiveLiquidity.div(Config.masternode.collateral + Config.masternode.fee).toNumber())
      : Math.floor(excessiveLiquidity.div(Config.masternode.collateral).toNumber());

    if (masternodeChangeCount > 0) {
      await this.startMasternodeEnabling(masternodeChangeCount);
    } else {
      await this.startMasternodeResigning(Math.abs(masternodeChangeCount));
    }
  }

  private async getExcessiveLiquidity(): Promise<BigNumber> {
    const currentLiquidity = await this.getCurrentLiquidity();

    if (currentLiquidity.gt(Config.staking.liquidity.max)) return currentLiquidity.minus(Config.staking.liquidity.max);
    if (currentLiquidity.lt(Config.staking.liquidity.min)) return currentLiquidity.minus(Config.staking.liquidity.min);

    return new BigNumber(0);
  }

  private async getCurrentLiquidity(): Promise<BigNumber> {
    const balance = await this.client.getUTXOBalance(Config.staking.liquidity.address);

    const resigningMasternodes = await this.masternodeService.getAllResigning();
    const pendingResignAmount = resigningMasternodes.length * Config.masternode.collateral;

    const pendingWithdrawals = await this.withdrawalService.getPendingWithdrawals();
    const pendingWithdrawalAmount = Util.sumObj(pendingWithdrawals, 'amount');

    return balance.plus(pendingResignAmount).minus(pendingWithdrawalAmount);
  }

  // --- MASTERNODES ---- //
  private async checkMasternodesInProcess(): Promise<void> {
    const allInProcessMasternodes = await this.masternodeService.getAllWithStates([
      MasternodeState.ENABLING,
      MasternodeState.RESIGNING,
      MasternodeState.PRE_ENABLED,
      MasternodeState.PRE_RESIGNED,
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
  }

  private async startMasternodeEnabling(count: number, timeLock = MasternodeTimeLock.NONE): Promise<void | void[]> {
    // get n addresses from the masternode table, where masternode state is idle
    const idleMasternodes = await this.masternodeService.getIdleMasternodes(count);
    const newOwners = await this.masternodeService.getNewOwners(count);
    idleMasternodes.forEach((node, i) => {
      const info = newOwners[i];
      node.accountIndex = info.index;
      node.owner = info.address;
      node.ownerWallet = info.wallet;
      node.timeLock = timeLock;
    });
    return this.handleMasternodesWithState(idleMasternodes, MasternodeState.IDLE);
  }

  private async startMasternodeResigning(count: number): Promise<void | void[]> {
    const masternodes = await this.masternodeService.getOrderedByTms();
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

    const process = this.getProcessFunctionsFor(state);

    return Promise.all(
      filteredMasternodes.map((node) =>
        process
          .txFunc(node)
          .then((txId: string) => process.updateFunc(node, txId))
          .catch(console.error),
      ),
    );
  }

  // --- WITHDRAWALS --- //
  async prepareWithdrawals(): Promise<void> {
    const balance = await this.client.getUTXOBalance(Config.staking.liquidity.address);
    const withdrawals = await this.withdrawalService.getPendingWithdrawals();

    const sortedWithdrawals = withdrawals.sort((a, b) => a.amount - b.amount);

    // determine possible withdrawals
    const possibleWithdrawals = [];
    let withdrawalSum = 0;
    for (const withdrawal of sortedWithdrawals) {
      withdrawalSum += withdrawal.amount;
      if (balance.minus(1).lt(withdrawalSum)) break;

      possibleWithdrawals.push(withdrawal);
    }

    if (possibleWithdrawals.length <= 0) return;

    // prepare
    await Promise.all(
      possibleWithdrawals.map((w) =>
        this.withdrawalService
          .designateWithdrawal(w)
          .catch((e) => console.error(`Failed to prepare withdrawal ${w.id}:`, e)),
      ),
    );
  }

  // --- HELPER METHODS --- //
  private getProcessFunctionsFor(state: MasternodeState): {
    txFunc: (masternode: Masternode) => Promise<string>;
    updateFunc: (masternode: Masternode, txId: string) => Promise<void>;
  } {
    switch (state) {
      case MasternodeState.IDLE:
        return {
          txFunc: (masternode: Masternode) => {
            return this.transactionCreationService.sendFromLiq({
              to: masternode.owner,
              amount: new BigNumber(
                Config.masternode.collateral + Config.masternode.fee + Config.masternode.creationFee,
              ),
              ownerWallet: Config.staking.liquidity.wallet,
              accountIndex: +Config.staking.liquidity.account,
            });
          },
          updateFunc: (masternode: Masternode, txId: string) => {
            console.info(`Sending collateral to masternode\n\towner: ${masternode.owner}\n\twith tx: ${txId}`);
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
            return this.transactionCreationService.createMasternode({
              masternode,
              ownerWallet: masternode.ownerWallet,
              accountIndex: masternode.accountIndex,
            });
          },
          updateFunc: (masternode: Masternode, txId: string) => {
            console.info(`Creating masternode for\n\towner: ${masternode.owner}\n\twith tx: ${txId}`);
            return this.masternodeService.preEnabled(masternode.id, txId);
          },
        };
      case MasternodeState.PRE_ENABLED:
        return {
          txFunc: () => {
            return Promise.resolve('');
          },
          updateFunc: (masternode: Masternode) => {
            console.info(`Masternode got enabled\n\towner: ${masternode.owner}`);
            return this.masternodeService.enabled(masternode.id);
          },
        };
      case MasternodeState.ENABLED:
        return {
          txFunc: (masternode: Masternode) => {
            return this.transactionCreationService.sendFromLiq({
              to: masternode.owner,
              amount: new BigNumber(Config.masternode.resignFee),
              ownerWallet: Config.staking.liquidity.wallet,
              accountIndex: +Config.staking.liquidity.account,
            });
          },
          updateFunc: (masternode: Masternode, txId: string) => {
            console.info(`Sending resign fee to masternode\n\towner: ${masternode.owner}\n\twith tx: ${txId}`);
            return this.masternodeService.resigning(masternode.id);
          },
        };
      case MasternodeState.RESIGNING:
        return {
          txFunc: (masternode: Masternode) => {
            return this.transactionCreationService.resignMasternode({
              masternode,
              ownerWallet: masternode.ownerWallet,
              accountIndex: masternode.accountIndex,
            });
          },
          updateFunc: (masternode: Masternode, txId: string) => {
            console.info(`Resigning masternode for\n\towner: ${masternode.owner}\n\twith tx: ${txId}`);
            return this.masternodeService.preResigned(masternode.id, txId);
          },
        };
      case MasternodeState.PRE_RESIGNED:
        return {
          txFunc: (masternode: Masternode) => {
            return this.transactionCreationService.sendToLiq({
              from: masternode.owner,
              amount: new BigNumber(Config.masternode.collateral),
              ownerWallet: masternode.ownerWallet,
              accountIndex: masternode.accountIndex,
            });
          },
          updateFunc: (masternode: Masternode, txId: string) => {
            console.info(
              `Sending collateral back to liquidity manager from\n\towner: ${masternode.owner}\n\twith tx: ${txId}`,
            );
            return this.masternodeService.resigned(masternode.id);
          },
        };
    }
  }
}
