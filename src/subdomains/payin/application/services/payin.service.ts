import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { Lock } from 'src/shared/lock';
import { AssetService } from 'src/shared/models/asset/asset.service';
import { Not } from 'typeorm';
import { PayIn, PayInPurpose, PayInStatus } from '../../domain/entities/payin.entity';
import { PayInDeFiChainService } from '../../infrastructure/payin-crypto-defichain.service';
import { PayInFactory } from '../factories/payin.factory';
import { PayInTransaction } from '../interfaces';
import { PayInRepository } from '../repositories/payin.repository';

@Injectable()
export class PayInService {
  private readonly lock = new Lock(7200);

  constructor(
    private readonly repository: PayInRepository,
    private readonly factory: PayInFactory,
    private readonly deFiChainService: PayInDeFiChainService,
    private readonly assetService: AssetService,
  ) {}

  //*** PUBLIC API ***//

  async getNewPayInTransactions(): Promise<PayIn[]> {
    return this.repository.find({ status: Not(PayInStatus.ACKNOWLEDGED) });
  }

  async acknowledgePayIn(payIn: PayIn, purpose: PayInPurpose): Promise<void> {
    const _payIn = await this.repository.findOne(payIn.id);

    _payIn.acknowledge(purpose);

    await this.repository.save(_payIn);
  }

  //*** JOBS ***//

  @Interval(300000)
  async checkPayInTransactions(): Promise<void> {
    if (!this.lock.acquire()) return;

    try {
      await this.processNewPayInTransactions();
    } catch (e) {
      console.error('Exception during DeFiChain input checks:', e);
    } finally {
      this.lock.release();
    }
  }

  //*** HELPER METHODS ***//

  private async processNewPayInTransactions(): Promise<void> {
    const lastCheckedBlockHeight = await this.repository
      .findOne({ order: { blockHeight: 'DESC' } })
      .then((input) => input?.blockHeight ?? 0);

    const newTransactions = await this.deFiChainService.getNewTransactionsSince(lastCheckedBlockHeight);
    const newPayIns = await this.createNewPayIns(newTransactions);

    newPayIns.length > 0 && console.log(`New DeFiChain inputs (${newPayIns.length}):`, newPayIns);

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
    });

    if (!assetEntity) {
      const message = `Failed to process DeFiChain input. No asset ${tx.asset} found. PayInTransaction:`;
      console.error(message, tx);

      throw new Error(message);
    }

    return this.factory.createFromTransaction(tx, assetEntity);
  }

  // TODO - consider more reliable solution - in case of DB fail, some PayIns might be lost
  private async persistPayIns(payIns: PayIn[]): Promise<void> {
    for (const payIn of payIns) {
      await this.repository.save(payIn);
    }
  }
}
