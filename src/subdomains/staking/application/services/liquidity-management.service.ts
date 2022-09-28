import { Lock } from 'src/shared/lock';
import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { NodeService, NodeType } from 'src/blockchain/ain/node/node.service';
import { Config } from 'src/config/config';
import { Util } from 'src/shared/util';
import { MasternodeState } from '../../domain/enums';
import { MasternodeService } from 'src/integration/masternode/application/services/masternode.service';
import { StakingWithdrawalService } from './staking-withdrawal.service';
import { DeFiClient } from 'src/blockchain/ain/node/defi-client';
import { Withdrawal } from '../../domain/entities/withdrawal.entity';

@Injectable()
export class LiquidityManagementService {
  private readonly lock = new Lock(1800);

  private client: DeFiClient;

  constructor(
    private readonly masternodeService: MasternodeService,
    private readonly withdrawalService: StakingWithdrawalService,
    nodeService: NodeService,
  ) {
    nodeService.getConnectedNode(NodeType.LIQ).subscribe((c) => (this.client = c));

    this.prepareWithdrawals();
  }

  @Interval(300000)
  async doTasks() {
    if (!this.lock.acquire()) return;

    try {
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
      await this.createMasternodes(masternodeChangeCount);
    } else {
      await this.resignMasternodes(Math.abs(masternodeChangeCount));
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

    const resigningMasternodes = await this.masternodeService.getResigning();
    const pendingResignAmount = resigningMasternodes.length * Config.masternode.collateral;

    const pendingWithdrawals = await this.getPendingWithdrawals();
    const pendingWithdrawalAmount = Util.sumObj(pendingWithdrawals, 'amount');

    return balance + pendingResignAmount - pendingWithdrawalAmount;
  }

  // --- MASTERNODES ---- //
  private async createMasternodes(count: number): Promise<void> {
    // get n addresses from the masternode table, where masternode state is idle
    const idleMasternodes = await this.masternodeService.getIdleMasternodes(count);

    let tx: string;
    for (const node of idleMasternodes) {
      tx = await this.client.sendUtxoToMany([
        {
          addressTo: node.owner,
          amount: Config.masternode.collateral + Config.masternode.fee + Config.masternode.creationFee,
        },
      ]);
      console.info(`Sending collateral to masternode wallet: ${tx}`);

      await this.masternodeService.designateCreating(node.id);
    }

    if (tx) await this.client.waitForTx(tx).catch((e) => console.error(`Wait for creation TX failed: ${e}`));
  }

  private async resignMasternodes(count: number): Promise<void> {
    const masternodes = await this.masternodeService.getOrderedByTms();

    for (const masternode of masternodes.slice(0, count)) {
      console.info(`Resigning masternode ${masternode.id}`);

      const message = Util.template(Config.masternode.resignMessage, {
        id: masternode.id.toString(),
        hash: masternode.creationHash,
      });
      const signature = await this.client.signMessage(Config.staking.liquidityWalletAddress, message);

      await this.masternodeService.prepareResign(masternode.id, signature, MasternodeState.RESIGN_REQUESTED);
    }
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
}
