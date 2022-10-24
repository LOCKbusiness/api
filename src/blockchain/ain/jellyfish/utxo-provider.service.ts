import { AddressUnspent } from '@defichain/whale-api-client/dist/api/address';
import { Prevout } from '@defichain/jellyfish-transaction-builder';
import BigNumber from 'bignumber.js';
import { SmartBuffer } from 'smart-buffer';
import { toOPCodes } from '@defichain/jellyfish-transaction';
import { WhaleClient } from '../whale/whale-client';
import { WhaleService } from '../whale/whale.service';
import { Injectable } from '@nestjs/common';
import { Config } from 'src/config/config';

export interface UtxoInformation {
  prevouts: Prevout[];
  scriptHex: string;
  total: BigNumber;
}

export enum UtxoSizePriority {
  BIG,
  SMALL,
}

@Injectable()
export class UtxoProviderService {
  private blockHeight = 0;
  private unspent = new Map<string, AddressUnspent[]>();
  private spent = new Map<string, NodeJS.Timeout>();

  private whaleClient?: WhaleClient;

  constructor(whaleService: WhaleService) {
    whaleService.getClient().subscribe((client) => (this.whaleClient = client));
  }

  // --- QUEUED ENTRY POINTS --- //
  async provideExactAmount(address: string, amount: BigNumber): Promise<UtxoInformation> {
    const unspent = await this.retrieveUnspent(address);
    return UtxoProviderService.parseUnspent(
      this.markUsed(address, UtxoProviderService.provideExactAmount(address, unspent, amount)),
    );
  }

  async provideUntilAmount(
    address: string,
    amount: BigNumber,
    sizePriority: UtxoSizePriority,
  ): Promise<UtxoInformation> {
    const unspent = await this.retrieveUnspent(address);
    return UtxoProviderService.parseUnspent(
      this.markUsed(address, UtxoProviderService.provideUntilAmount(unspent, amount, sizePriority)),
    );
  }

  // --- HELPER METHODS --- //
  private markUsed(address: string, unspent: AddressUnspent[]): AddressUnspent[] {
    unspent.forEach((u) => {
      const id = UtxoProviderService.idForUnspent(u);
      this.spent.set(
        id,
        setTimeout(() => {
          this.spent.delete(id);
        }, Config.staking.timeout.utxo),
      );
    });
    this.unspent.set(
      address,
      this.unspent
        .get(address)
        ?.filter(
          (u) =>
            !unspent.map((us) => UtxoProviderService.idForUnspent(us)).includes(UtxoProviderService.idForUnspent(u)),
        ),
    );
    return unspent;
  }

  private async retrieveUnspent(address: string): Promise<AddressUnspent[]> {
    await this.checkBlockAndInvalidate(address);
    return this.unspent.get(address);
  }

  private async checkBlockAndInvalidate(address: string) {
    const forceNew = this.unspent.get(address) === undefined;
    const currentBlockHeight = await this.whaleClient.getBlockHeight();
    if (!forceNew && this.blockHeight === currentBlockHeight) return;

    this.blockHeight = currentBlockHeight;

    const currentUnspent = await this.whaleClient.getAllUnspent(address);
    this.unspent.set(
      address,
      currentUnspent.filter((u) => !this.spent.has(UtxoProviderService.idForUnspent(u))),
    );
  }

  private static provideExactAmount(
    address: string,
    unspent: AddressUnspent[],
    expectedAmount: BigNumber,
  ): AddressUnspent[] {
    const wantedUnspent = unspent.find((u) => new BigNumber(u.vout.value).isEqualTo(expectedAmount));

    if (!wantedUnspent) throw new Error(`Unspent on ${address} with amount of ${expectedAmount.toString()} not found`);
    return [wantedUnspent];
  }

  private static provideUntilAmount(
    unspent: AddressUnspent[],
    amount: BigNumber,
    sizePriority: UtxoSizePriority,
  ): AddressUnspent[] {
    const amountPlusFeeBuffer = amount.plus(Config.blockchain.minFeeBuffer);
    let total = new BigNumber(0);
    const neededUnspent: AddressUnspent[] = [];
    unspent = unspent.sort((a, b) =>
      sizePriority === UtxoSizePriority.BIG ? this.orderDescending(a, b) : this.orderAscending(a, b),
    );
    unspent.forEach((u) => {
      if (total.gte(amountPlusFeeBuffer)) return;
      neededUnspent.push(u);
      total = total.plus(u ? new BigNumber(u.vout.value) : 0);
    });
    if (total.lt(amountPlusFeeBuffer))
      throw new Error(
        `Not enough available liquidity for requested amount.\nTotal available: ${total}\nRequested amount: ${amountPlusFeeBuffer}`,
      );
    if (neededUnspent.length > Config.utxo.maxInputs)
      throw new Error(`Exceeding amount of max allowed inputs of ${Config.utxo.maxInputs}`);
    return neededUnspent;
  }

  private static idForUnspent(unspent: AddressUnspent): string {
    return `${unspent.vout.txid}|${unspent.vout.n}`;
  }

  private static orderAscending(a: AddressUnspent, b: AddressUnspent): number {
    return new BigNumber(a.vout.value).minus(new BigNumber(b.vout.value)).toNumber();
  }

  private static orderDescending(a: AddressUnspent, b: AddressUnspent): number {
    return new BigNumber(b.vout.value).minus(new BigNumber(a.vout.value)).toNumber();
  }

  // --- PARSING --- //
  private static parseUnspent(unspent: AddressUnspent[]): UtxoInformation {
    let scriptHex = '';
    let total = new BigNumber(0);
    const prevouts = unspent?.map((item): Prevout => {
      scriptHex = item.script.hex;
      total = total.plus(item ? new BigNumber(item.vout.value) : 0);
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
    return { prevouts, scriptHex, total };
  }
}
