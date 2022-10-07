import { Lock } from 'src/shared/lock';
import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { NodeService, NodeType } from 'src/blockchain/ain/node/node.service';
import { Config } from 'src/config/config';
import { Util } from 'src/shared/util';
import { MasternodeService } from 'src/integration/masternode/application/services/masternode.service';
import { StakingWithdrawalService } from './staking-withdrawal.service';
import { DeFiClient } from 'src/blockchain/ain/node/defi-client';
import { Withdrawal } from '../../domain/entities/withdrawal.entity';
import BigNumber from 'bignumber.js';
import { MasternodeState } from '../../domain/enums';
import { Masternode } from 'src/integration/masternode/domain/entities/masternode.entity';
import { TransactionExecutionService } from 'src/integration/transaction/application/services/transaction-execution.service';

@Injectable()
export class LiquidityManagementService {
  private readonly lock = new Lock(1800);

  private client: DeFiClient;

  constructor(
    private readonly masternodeService: MasternodeService,
    private readonly withdrawalService: StakingWithdrawalService,
    private readonly transactionCreationService: TransactionExecutionService,
    nodeService: NodeService,
  ) {
    nodeService.getConnectedNode(NodeType.LIQ).subscribe((c) => (this.client = c));

    this.prepareWithdrawals();
  }

  @Interval(300000)
  async doTasks() {
    if (!this.lock.acquire()) return;

    try {
      await this.checkMasternodesInProcess();
      await this.checkLiquidity();
      await this.prepareWithdrawals();
    } catch (e) {
      console.error(`Exception during liquidity check: ${e}`);
    }

    this.lock.release();
  }

  async checkLiquidity(): Promise<void> {
    const excessiveLiquidity = await this.getExcessiveLiquidity();

    const masternodeChangeCount =
      excessiveLiquidity > 0
        ? Math.floor(excessiveLiquidity / (Config.masternode.collateral + Config.masternode.fee))
        : Math.floor(excessiveLiquidity / Config.masternode.collateral);

    if (masternodeChangeCount > 0) {
      await this.startMasternodeEnabling(masternodeChangeCount);
    } else {
      await this.startResignMasternodes(Math.abs(masternodeChangeCount));
    }
  }

  private async getExcessiveLiquidity(): Promise<number> {
    const currentLiquidity = await this.getCurrentLiquidity();

    if (currentLiquidity > Config.staking.liquidity.max) return currentLiquidity - Config.staking.liquidity.max;
    if (currentLiquidity < Config.staking.liquidity.min) return currentLiquidity - Config.staking.liquidity.min;

    return 0;
  }

  private async getCurrentLiquidity(): Promise<number> {
    const balance = await this.client.getBalance();

    const resigningMasternodes = await this.masternodeService.getAllResigning();
    const pendingResignAmount = resigningMasternodes.length * Config.masternode.collateral;

    const pendingWithdrawals = await this.getPendingWithdrawals();
    const pendingWithdrawalAmount = Util.sumObj(pendingWithdrawals, 'amount');

    return balance + pendingResignAmount - pendingWithdrawalAmount;
  }

  // --- MASTERNODES ---- //
  private async checkMasternodesInProcess(): Promise<void> {
    const allInProcessMasternodes = await this.masternodeService.getAllWithStates([
      MasternodeState.ENABLING,
      MasternodeState.RESIGNING,
    ]);
    await this.handleMasternodesWithState(allInProcessMasternodes, MasternodeState.ENABLING);
    await this.handleMasternodesWithState(allInProcessMasternodes, MasternodeState.RESIGNING);

    // TODO (Krysh) check blockchain if pre_enabled are created or pre_resigned are resigned
  }

  private async startMasternodeEnabling(count: number): Promise<void | void[]> {
    // get n addresses from the masternode table, where masternode state is idle
    const idleMasternodes = await this.masternodeService.getIdleMasternodes(count);
    return this.handleMasternodesWithState(idleMasternodes, MasternodeState.IDLE);
  }

  private async startResignMasternodes(count: number): Promise<void | void[]> {
    const masternodes = await this.masternodeService.getOrderedByTms();
    return this.handleMasternodesWithState(masternodes.splice(0, count), MasternodeState.ENABLED);
  }

  private async handleMasternodesWithState(masternodes: Masternode[], state: MasternodeState): Promise<void | void[]> {
    const filteredMasternodes = masternodes.filter((mn) => mn.state === state);

    const [txFunction, updateFunction] = this.receiveTxFunctionFor(state);

    return Promise.all(
      filteredMasternodes.map((node) => txFunction(node).then((txId: string) => updateFunction(node, txId))),
    ).catch(console.error);
  }

  // --- WITHDRAWALS --- //
  async prepareWithdrawals(): Promise<void> {
    const balance = await this.client.getBalance();
    const withdrawals = await this.getPendingWithdrawals();

    const sortedWithdrawals = withdrawals.sort((a, b) => a.amount - b.amount);

    // determine possible withdrawals
    const possibleWithdrawals = [];
    let withdrawalSum = 0;
    for (const withdrawal of sortedWithdrawals) {
      withdrawalSum += withdrawal.amount;
      if (withdrawalSum > balance - 1) break;

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
  private async getPendingWithdrawals(): Promise<Withdrawal[]> {
    const stakingList = await this.withdrawalService.getStakingWithPendingWithdrawals();
    return stakingList.reduce(
      (prev, curr) => prev.concat(curr.getPendingWithdrawals().map((w) => Object.assign(w, { staking: curr }))),
      [],
    );
  }

  private receiveTxFunctionFor(
    state: MasternodeState,
  ): [(masternode: Masternode) => Promise<string>, (masternode: Masternode, txId: string) => Promise<void>] {
    switch (state) {
      case MasternodeState.IDLE:
        return [
          (masternode: Masternode) => {
            return this.transactionCreationService.sendFromLiq({
              to: masternode.owner,
              amount: new BigNumber(
                Config.masternode.collateral + Config.masternode.fee + Config.masternode.creationFee,
              ),
              ownerWallet: masternode.ownerWallet,
              accountIndex: masternode.accountIndex,
            });
          },
          (masternode: Masternode) => {
            console.info(`Sending collateral to masternode owner: ${masternode.owner}`);
            return this.masternodeService.designateEnabling(masternode.id);
          },
        ];
      case MasternodeState.ENABLING:
        return [
          (masternode: Masternode) => {
            return this.transactionCreationService.createMasternode({
              masternode,
              ownerWallet: masternode.ownerWallet,
              accountIndex: masternode.accountIndex,
            });
          },
          (masternode: Masternode, txId: string) => {
            console.info(`Creating masternode for owner: ${masternode.owner}`);
            return this.masternodeService.designatePreEnabled(masternode.id, txId);
          },
        ];
      case MasternodeState.ENABLED:
        return [
          (masternode: Masternode) => {
            return this.transactionCreationService.sendFromLiq({
              to: masternode.owner,
              amount: new BigNumber(Config.masternode.resignFee),
              ownerWallet: masternode.ownerWallet,
              accountIndex: masternode.accountIndex,
            });
          },
          (masternode: Masternode) => {
            console.info(`Sending resign fee to masternode owner: ${masternode.owner}`);
            return this.masternodeService.designateResigning(masternode.id);
          },
        ];
      case MasternodeState.RESIGNING:
        return [
          (masternode: Masternode) => {
            return this.transactionCreationService.resignMasternode({
              masternode,
              ownerWallet: masternode.ownerWallet,
              accountIndex: masternode.accountIndex,
            });
          },
          (masternode: Masternode, txId: string) => {
            console.info(`Resigning masternode for owner: ${masternode.owner}`);
            return this.masternodeService.designatePreResigned(masternode.id, txId);
          },
        ];
    }
  }
}
