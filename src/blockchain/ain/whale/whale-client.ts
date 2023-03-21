import { ApiPagedResponse, WhaleApiClient, WhaleApiError } from '@defichain/whale-api-client';
import { AddressToken, AddressUnspent } from '@defichain/whale-api-client/dist/api/address';
import { CollateralToken, LoanVaultActive, LoanVaultState } from '@defichain/whale-api-client/dist/api/loan';
import { TokenData } from '@defichain/whale-api-client/dist/api/tokens';
import { Transaction, TransactionVin } from '@defichain/whale-api-client/dist/api/transactions';
import { SchedulerRegistry } from '@nestjs/schedule';
import BigNumber from 'bignumber.js';
import { BehaviorSubject, Observable } from 'rxjs';
import { GetConfig } from 'src/config/config';
import { AsyncMap } from 'src/shared/async-map';
import { Lock } from 'src/shared/lock';
import { Util } from 'src/shared/util';

export class WhaleClient {
  private readonly secondsPerBlock = 30;
  private readonly client: WhaleApiClient;
  private readonly transactions = new AsyncMap<string, string>(this.constructor.name);
  public readonly index: number;

  readonly #blockHeight: BehaviorSubject<number>;

  constructor(scheduler: SchedulerRegistry, url: string, client?: WhaleApiClient, index?: number) {
    this.client =
      client ?? new WhaleApiClient({ network: GetConfig().whale.network, version: GetConfig().whale.version, url });
    this.index = index;
    this.#blockHeight = new BehaviorSubject(0);

    // setup block poller
    const interval = setInterval(() => this.pollBlockHeight(), 1000);
    scheduler.addInterval(Util.randomId().toString(), interval);

    // check transactions
    this.#blockHeight.subscribe(() => this.checkTransactions());
  }

  get blockHeight(): Observable<number> {
    return this.#blockHeight.asObservable();
  }

  get currentBlockHeight(): number {
    return this.#blockHeight.value;
  }

  async getNearestBlockAt(date: Date): Promise<number> {
    let targetTime = new Date();
    let targetHeight = this.currentBlockHeight;

    if (date > targetTime) return targetHeight;

    // iterative search
    for (let i = 0; i < 10 && Math.abs(Util.minutesDiff(targetTime, date)) > 10; i++) {
      const timeDiff = Util.secondsDiff(date, targetTime);

      targetHeight = Util.round(targetHeight - timeDiff / this.secondsPerBlock, 0);
      const targetBlock = await this.client.blocks.get(`${targetHeight}`);
      targetTime = new Date(targetBlock.time * 1000);
    }

    // get nearest block from range
    const blocks = await this.client.blocks.list(100, `${targetHeight + 50}`);
    return blocks.find((b) => new Date(b.time * 1000) < date)?.height;
  }

  async getUtxoBalance(address: string): Promise<BigNumber> {
    return this.client.address.getBalance(address).then(BigNumber);
  }

  async getTokenBalances(address: string): Promise<AddressToken[]> {
    return this.getAll(() => this.client.address.listToken(address));
  }

  async getTokenBalance(address: string, token: string): Promise<BigNumber> {
    return this.getTokenBalances(address)
      .then((tb) => tb.find((b) => b.symbol === token)?.amount ?? 0)
      .then(BigNumber);
  }

  async getAllUnspent(address: string): Promise<AddressUnspent[]> {
    return this.getAll(() => this.client.address.listTransactionUnspent(address, 200));
  }

  async getAllTokens(): Promise<TokenData[]> {
    return this.getAll(() => this.client.tokens.list(200));
  }

  async getAllCollateralTokens(): Promise<CollateralToken[]> {
    return this.getAll(() => this.client.loan.listCollateralToken(200));
  }

  async getVault(vaultId: string): Promise<LoanVaultActive> {
    const vault = await this.client.loan.getVault(vaultId);
    if (vault.state === LoanVaultState.IN_LIQUIDATION) return undefined;
    return vault;
  }

  async sendRaw(hex: string): Promise<string> {
    return this.client.rawtx.send({ hex });
  }

  async waitForTx(txId: string, timeout = 600000): Promise<string> {
    return this.transactions.wait(txId, timeout);
  }

  async getTx(txId: string): Promise<Transaction | undefined> {
    return this.client.transactions.get(txId).catch((e: WhaleApiError) => {
      if (e.code === 404) return undefined;
      throw e;
    });
  }

  async getTxVins(txId: string): Promise<TransactionVin[]> {
    return this.client.transactions.getVins(txId);
  }

  async getHealth(): Promise<string | undefined> {
    const test = this.client.stats
      .get()
      .then(() => undefined)
      .catch((e) => e.message);

    return test;
  }

  // --- HELPER METHODS --- //
  private async getAll<T>(method: () => Promise<ApiPagedResponse<T>>): Promise<T[]> {
    const batches = [await method()];
    while (batches[batches.length - 1].hasNext) {
      try {
        batches.push(await this.client.paginate(batches[batches.length - 1]));
      } catch (e) {
        break;
      }
    }

    return batches.reduce((prev, curr) => prev.concat(curr), [] as T[]);
  }

  private async pollBlockHeight() {
    try {
      const currentBlockHeight = (await this.client.stats.get()).count.blocks;
      if (currentBlockHeight !== this.#blockHeight.value) this.#blockHeight.next(currentBlockHeight);
    } catch (e) {
      console.error('Exception during block polling:', e);
    }
  }

  @Lock(300)
  private async checkTransactions() {
    if (this.transactions.get().length === 0) return;

    await Util.doInBatches(this.transactions.get(), (txIds) => Promise.all(txIds.map((tx) => this.checkTx(tx))), 10);
  }

  private async checkTx(txId: string) {
    const tx: Transaction = await this.getTx(txId).catch(() => undefined);
    if (tx) {
      this.transactions.resolve(txId, tx.id);
    }
  }
}
