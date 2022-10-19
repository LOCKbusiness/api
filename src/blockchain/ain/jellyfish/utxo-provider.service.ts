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
  total?: BigNumber;
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
    const utxo = await this.retrieveUtxoAndPrevouts(address);
    return this.markUsed(address, UtxoProviderService.provideExactAmount(address, utxo, amount));
  }

  async provideUntilAmount(address: string, amount: BigNumber): Promise<UtxoInformation> {
    const utxo = await this.retrieveUtxoAndPrevouts(address);
    return this.markUsed(address, UtxoProviderService.provideUntilAmount(utxo, amount));
  }

  // --- HELPER METHODS --- //
  private markUsed(address: string, utxo: UtxoInformation): UtxoInformation {
    utxo.prevouts.forEach((p) => {
      const id = UtxoProviderService.idForPrevout(p);
      this.spent.set(
        id,
        setTimeout(() => {
          this.spent.delete(id);
        }, Config.staking.timeout.utxo),
      );
    });
    this.unspent.set(
      address,
      this.unspent.get(address)?.filter((u) => !utxo.prevouts.map((p) => p.txid).includes(u.vout.txid)),
    );
    return utxo;
  }

  private async retrieveUtxoAndPrevouts(address: string): Promise<UtxoInformation> {
    await this.checkBlockAndInvalidate(address);
    const utxo = UtxoProviderService.parseUnspent(this.unspent.get(address));
    return utxo;
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
    utxo: UtxoInformation,
    expectedAmount: BigNumber,
  ): UtxoInformation {
    const wantedUtxo = utxo.prevouts.find((u) => u.value.isEqualTo(expectedAmount));

    if (!wantedUtxo) throw new Error(`Unspent on ${address} with amount of ${expectedAmount.toString()} not found`);
    return { ...utxo, prevouts: [wantedUtxo] };
  }

  private static provideUntilAmount(utxo: UtxoInformation, amount: BigNumber): UtxoInformation {
    const amountPlusFeeBuffer = amount.plus(Config.blockchain.minFeeBuffer);
    let total = new BigNumber(0);
    const neededPrevouts: Prevout[] = [];
    utxo.prevouts.forEach((p) => {
      if (total.gte(amountPlusFeeBuffer)) return;
      neededPrevouts.push(p);
      total = total.plus(p ? p.value : 0);
    });
    if (total.lt(amountPlusFeeBuffer))
      throw new Error(
        `Not enough available liquidity for requested amount.\nTotal available: ${total}\nRequested amount: ${amountPlusFeeBuffer}`,
      );
    return { prevouts: neededPrevouts, scriptHex: utxo.scriptHex, total };
  }

  private static idForPrevout(prevout: Prevout): string {
    return `${prevout.txid}|${prevout.vout}`;
  }

  private static idForUnspent(unspent: AddressUnspent): string {
    return `${unspent.vout.txid}|${unspent.vout.n}`;
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
