import { AddressUnspent } from '@defichain/whale-api-client/dist/api/address';
import { Prevout } from '@defichain/jellyfish-transaction-builder';
import BigNumber from 'bignumber.js';
import { SmartBuffer } from 'smart-buffer';
import { toOPCodes } from '@defichain/jellyfish-transaction';
import { WhaleClient } from '../whale/whale-client';
import { WhaleService } from '../whale/whale.service';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { QueueHandler } from 'src/shared/queue-handler';
import { SchedulerRegistry } from '@nestjs/schedule';

export interface UtxoInformation {
  prevouts: Prevout[];
  scriptHex: string;
  total?: BigNumber;
}

@Injectable()
export class UtxoProviderService {
  private blockHeight = 0;
  private unspent = new Map<string, AddressUnspent[]>();
  private currentPrevouts = new Map<string, Prevout[]>();

  private whaleClient?: WhaleClient;
  private readonly queue: QueueHandler;

  constructor(whaleService: WhaleService, scheduler: SchedulerRegistry) {
    this.queue = new QueueHandler(scheduler, 65000);
    whaleService.getClient().subscribe((client) => {
      this.whaleClient = client;
      // this.queue.activate();
    });
  }

  // --- QUEUED ENTRY POINTS --- //
  async provideExactAmount(address: string, amount: BigNumber): Promise<UtxoInformation> {
    console.log('provideExactAmount', address, amount.toString());
    return this.callApi(() => this.executeProvideExactAmount(address, amount));
  }

  async provideUntilAmount(address: string, amount: BigNumber): Promise<UtxoInformation> {
    console.log('provideUntilAmount', address, amount.toString());
    return this.callApi(() => this.executeProvideUntilAmount(address, amount));
  }

  async insertPrevout(prevout: Prevout, address: string): Promise<void> {
    console.log('insertPrevout', prevout.txid, address);
    return this.callApi(() => this.executeInsertPrevout(prevout, address));
  }

  // --- REAL LOGIC --- //
  private async executeProvideExactAmount(address: string, amount: BigNumber): Promise<UtxoInformation> {
    console.log('executeProvideExactAmount', address, amount.toString(), this.blockHeight);
    const [utxo, prevouts] = await this.retrieveUtxoAndPrevouts(address);
    return this.markUsed(address, UtxoProviderService.provideExactAmount(address, utxo, prevouts, amount));
  }

  private async executeProvideUntilAmount(address: string, amount: BigNumber): Promise<UtxoInformation> {
    console.log('executeProvideUntilAmount', address, amount.toString(), this.blockHeight);
    const [utxo, prevouts] = await this.retrieveUtxoAndPrevouts(address);
    return this.markUsed(address, UtxoProviderService.provideUntilAmount(utxo, prevouts, amount));
  }

  private async executeInsertPrevout(prevout: Prevout, address: string): Promise<void> {
    console.log('executeInsertPrevout', prevout.txid, address);
    const alreadyExisting = this.currentPrevouts.get(address);
    this.currentPrevouts.set(address, (alreadyExisting ?? []).concat(prevout));
  }

  // --- HELPER METHODS --- //
  protected async callApi<T>(call: () => Promise<T>): Promise<T> {
    try {
      return await this.call(call);
    } catch (e) {
      console.log('Exception during api call:', e);
      throw new ServiceUnavailableException(e);
    }
  }

  private call<T>(call: () => Promise<T>): Promise<T> {
    return this.queue.handle(() => call());
  }

  private markUsed(address: string, utxo: UtxoInformation): UtxoInformation {
    console.log('markUsed', address, utxo.prevouts);
    this.unspent.set(
      address,
      this.unspent.get(address)?.filter((u) => !utxo.prevouts.map((p) => p.txid).includes(u.vout.txid)),
    );
    this.currentPrevouts.set(
      address,
      this.currentPrevouts.get(address)?.filter((p) => !utxo.prevouts.map((p) => p.txid).includes(p.txid)),
    );
    return utxo;
  }

  private async retrieveUtxoAndPrevouts(address: string): Promise<[UtxoInformation, Prevout[]]> {
    await this.checkBlockAndInvalidate(address);
    const utxo = UtxoProviderService.parseUnspent(this.unspent.get(address));
    const prevouts = this.currentPrevouts.get(address);
    return [utxo, prevouts];
  }

  private async checkBlockAndInvalidate(address: string) {
    const forceNew = this.unspent.get(address) === undefined || this.currentPrevouts.get(address) === undefined;
    console.log(`should force invalidations for ${address}? ${forceNew ? 'yes' : 'no'}`);
    const currentBlockHeight = await this.whaleClient.getBlockHeight();
    console.log(`  blockHeight stored ${this.blockHeight} current ${currentBlockHeight}`);
    if (!forceNew && this.blockHeight === currentBlockHeight) return;

    this.blockHeight = currentBlockHeight;

    console.log(`  receiving all unspent for ${address}`);
    const currentUnspent = await this.whaleClient.getAllUnspent(address);
    console.log(`  storing unspent ${currentUnspent.map((u) => u.id)}`);
    this.unspent.set(address, currentUnspent);
    this.currentPrevouts.set(address, []);
  }

  private static provideExactAmount(
    address: string,
    utxo: UtxoInformation,
    prevouts: Prevout[],
    expectedAmount: BigNumber,
  ): UtxoInformation {
    const prevoutsToUse = UtxoProviderService.combine(utxo, prevouts);
    const wantedUtxo = prevoutsToUse.find((u) => u.value.isEqualTo(expectedAmount));

    if (!wantedUtxo) throw new Error(`Unspent on ${address} with amount of ${expectedAmount.toString()} not found`);
    return { ...utxo, prevouts: [wantedUtxo] };
  }

  private static provideUntilAmount(utxo: UtxoInformation, prevouts: Prevout[], amount: BigNumber): UtxoInformation {
    let total = new BigNumber(0);
    const neededPrevouts: Prevout[] = [];
    const prevoutsToUse = UtxoProviderService.combine(utxo, prevouts);
    prevoutsToUse.forEach((p) => {
      if (total.gte(amount)) return;
      neededPrevouts.push(p);
      total = total.plus(p ? p.value : 0);
    });
    if (total.lt(amount))
      throw new Error(
        `Not enough available liquidity for requested amount.\nTotal available: ${total}\nRequested amount: ${amount}`,
      );
    return { prevouts: neededPrevouts, scriptHex: utxo.scriptHex, total };
  }

  private static combine(utxo: UtxoInformation, prevouts: Prevout[]): Prevout[] {
    return (prevouts ?? []).concat(utxo.prevouts);
  }

  // --- PARSING --- //
  private static parseUnspent(unspent: AddressUnspent[]): UtxoInformation {
    let scriptHex = '';
    const prevouts = unspent?.map((item): Prevout => {
      scriptHex = item.script.hex;
      return {
        txid: item.vout.txid,
        vout: item.vout.n,
        value: new BigNumber(item.vout.value),
        script: {
          // TODO(fuxingloh): needs to refactor once jellyfish refactor this.
          stack: toOPCodes(SmartBuffer.fromBuffer(Buffer.from(item.script.hex, 'hex'))),
        },
        tokenId: item.vout.tokenId ?? 0x00,
      };
    });
    return { prevouts, scriptHex };
  }
}
