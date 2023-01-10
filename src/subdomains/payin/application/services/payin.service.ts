import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Config, Process } from 'src/config/config';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { Lock } from 'src/shared/lock';
import { AssetService } from 'src/shared/models/asset/asset.service';
import { PayIn, PayInPurpose, PayInStatus } from '../../domain/entities/payin.entity';
import { PayInDeFiChainService } from '../../infrastructure/payin-crypto-defichain.service';
import { PayInFactory } from '../factories/payin.factory';
import { PayInTransaction } from '../interfaces';
import { PayInRepository } from '../repositories/payin.repository';

@Injectable()
export class PayInService {
  private readonly lock = new Lock(7200);

  constructor(
    private readonly payInRepository: PayInRepository,
    private readonly factory: PayInFactory,
    private readonly deFiChainService: PayInDeFiChainService,
    private readonly assetService: AssetService,
  ) {}

  //*** PUBLIC API ***//

  async getNewPayInTransactions(): Promise<PayIn[]> {
    return this.payInRepository.find({ status: PayInStatus.CONFIRMED });
  }

  async acknowledgePayIn(payIn: PayIn, purpose: PayInPurpose): Promise<void> {
    const _payIn = await this.payInRepository.findOne(payIn.id);

    _payIn.acknowledge(purpose);

    await this.payInRepository.save(_payIn);
  }

  async failedPayIn(payIn: PayIn, purpose: PayInPurpose): Promise<void> {
    const _payIn = await this.payInRepository.findOne(payIn.id);

    _payIn.fail(purpose);

    await this.payInRepository.save(_payIn);
  }

  //*** JOBS ***//

  @Cron(CronExpression.EVERY_30_SECONDS)
  async checkPayInTransactions(): Promise<void> {
    if (Config.processDisabled(Process.PAY_IN)) return;
    if (!this.lock.acquire()) return;

    try {
      await this.processNewTransactions();
      await this.processUnconfirmedTransactions();
    } catch (e) {
      console.error('Exception during DeFiChain pay in checks:', e);
    } finally {
      this.lock.release();
    }
  }

  //*** HELPER METHODS ***//

  private async processUnconfirmedTransactions(): Promise<void> {
    const unconfirmedPayIns = await this.payInRepository.find({ status: PayInStatus.CREATED });
    const confirmedPayIns = await this.deFiChainService.getConfirmedTransactions(unconfirmedPayIns);

    for (const payIn of confirmedPayIns) {
      payIn.confirm();
      await this.payInRepository.save(payIn);
    }
  }

  private async processNewTransactions(): Promise<void> {
    const lastCheckedBlockHeight = await this.payInRepository
      .findOne({ order: { blockHeight: 'DESC' } })
      .then((input) => input?.blockHeight ?? 0);

    const newTransactions = await this.deFiChainService.getNewTransactionsSince(lastCheckedBlockHeight);
    const newPayIns = await this.createNewPayIns(newTransactions);

    newPayIns.length > 0 && console.log(`New DeFiChain pay ins (${newPayIns.length}):`, newPayIns);

    await this.persistPayIns(newPayIns);
  }

  private async createNewPayIns(newTransactions: PayInTransaction[]): Promise<PayIn[]> {
    const payIns = [];

    for (const tx of newTransactions) {
      try {
        payIns.push(await this.createNewPayIn(tx));
      } catch {
        continue;
      }
    }

    return payIns;
  }

  private async createNewPayIn(tx: PayInTransaction): Promise<PayIn> {
    const assetEntity = await this.assetService.getAssetByQuery({
      name: tx.asset,
      blockchain: Blockchain.DEFICHAIN,
      type: tx.assetType,
    });

    if (!assetEntity) {
      const message = `Failed to process DeFiChain pay in. No asset ${tx.asset} found. PayInTransaction:`;
      console.error(message, tx);

      throw new Error(message);
    }

    return this.factory.createFromTransaction(tx, assetEntity);
  }

  // TODO - consider more reliable solution - in case of DB fail, some PayIns might be lost
  private async persistPayIns(payIns: PayIn[]): Promise<void> {
    for (const payIn of payIns) {
      await this.payInRepository.save(payIn);
    }
  }
}
