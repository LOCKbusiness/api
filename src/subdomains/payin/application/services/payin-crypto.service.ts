import { AccountHistory } from '@defichain/jellyfish-api-core/dist/category/account';
import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Lock } from 'src/shared/lock';
import { PayInCryptoDeFiChainService } from '../../infrastructure/payin-crypto-defichain.service';
import { PayInCryptoRepository } from '../repositories/payin-crypto.repository';

@Injectable()
export class PayInCryptoService {
  private readonly lock = new Lock(7200);

  constructor(
    private readonly repository: PayInCryptoRepository,
    private readonly deFiChainService: PayInCryptoDeFiChainService,
  ) {}

  //*** JOBS ***//

  @Interval(300000)
  async checkCryptoPayIns(): Promise<void> {
    if (!this.lock.acquire()) return;

    try {
      await this.processNewCryptoPayIns();
    } catch (e) {
      console.error('Exception during DeFiChain input checks:', e);
    } finally {
      this.lock.release();
    }
  }

  //*** HELPER METHODS ***//

  private async processNewCryptoPayIns(): Promise<void> {
    const lastCheckedBlockHeight = await this.repository
      .findOne({ order: { blockHeight: 'DESC' } })
      .then((input) => input?.blockHeight ?? 0);

    const newTransactions = await this.deFiChainService.getNewTransactionsSince(lastCheckedBlockHeight);
  }

  private async createNewCryptoPayIns(newTransactions: AccountHistory[]) {}
}
