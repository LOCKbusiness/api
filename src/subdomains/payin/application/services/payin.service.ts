import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Config, Process } from 'src/config/config';
import { Lock } from 'src/shared/lock';
import { Asset } from 'src/shared/entities/asset.entity';
import { PayIn, PayInPurpose, PayInStatus } from '../../domain/entities/payin.entity';
import { PayInDeFiChainService } from '../../infrastructure/payin-crypto-defichain.service';
import { PayInFactory } from '../factories/payin.factory';
import { PayInTransaction } from '../interfaces';
import { PayInRepository } from '../repositories/payin.repository';

@Injectable()
export class PayInService {
  constructor(
    private readonly payInRepository: PayInRepository,
    private readonly factory: PayInFactory,
    private readonly deFiChainService: PayInDeFiChainService,
  ) {}

  //*** PUBLIC API ***//

  async getNewPayInTransactions(): Promise<PayIn[]> {
    return this.payInRepository.findBy({ status: PayInStatus.CONFIRMED });
  }

  async getPayInAsset(address: string, txId: string, txSequence: number): Promise<Asset> {
    const payIn = await this.payInRepository.findOneBy({ address: { address }, txId, txSequence });
    if (!payIn) throw new Error(`Pay in ${txId} (${txSequence}) on ${address} not found`);

    return payIn.asset;
  }

  async hasPayInFor(txId: string, txSequence: number) {
    return this.payInRepository.exist({ where: { txId, txSequence } });
  }

  async acknowledgePayIn(payIn: PayIn, purpose: PayInPurpose): Promise<void> {
    const _payIn = await this.payInRepository.findOneBy({ id: payIn.id });

    _payIn.acknowledge(purpose);

    await this.payInRepository.save(_payIn);
  }

  async failedPayIn(payIn: PayIn, purpose: PayInPurpose): Promise<void> {
    const _payIn = await this.payInRepository.findOneBy({ id: payIn.id });

    _payIn.fail(purpose);

    await this.payInRepository.save(_payIn);
  }

  //*** JOBS ***//

  @Cron(CronExpression.EVERY_30_SECONDS)
  @Lock(7200)
  async checkPayInTransactions(): Promise<void> {
    if (Config.processDisabled(Process.PAY_IN)) return;

    await this.processNewTransactions();
    await this.processUnconfirmedTransactions();
  }

  //*** HELPER METHODS ***//

  private async processUnconfirmedTransactions(): Promise<void> {
    const unconfirmedPayIns = await this.payInRepository.findBy({ status: PayInStatus.CREATED });
    const confirmedPayIns = await this.deFiChainService.getConfirmedTransactions(unconfirmedPayIns);

    for (const payIn of confirmedPayIns) {
      payIn.confirm();
      await this.payInRepository.save(payIn);
    }
  }

  private async processNewTransactions(): Promise<void> {
    const lastCheckedBlockHeight = await this.payInRepository
      .findOne({ where: {}, order: { blockHeight: 'DESC' } })
      .then((input) => input?.blockHeight ?? 0);

    const newTransactions = await this.deFiChainService.getNewTransactionsSince(lastCheckedBlockHeight);
    const newPayIns = this.createNewPayIns(newTransactions);

    newPayIns.length > 0 && console.log(`New DeFiChain pay ins (${newPayIns.length}):`, newPayIns);

    await this.persistPayIns(newPayIns);
  }

  private createNewPayIns(newTransactions: PayInTransaction[]): PayIn[] {
    return newTransactions.map((tx) => this.factory.createFromTransaction(tx));
  }

  private async persistPayIns(payIns: PayIn[]): Promise<void> {
    await this.payInRepository.saveMany(payIns);
  }
}
