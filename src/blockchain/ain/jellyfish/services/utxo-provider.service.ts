import { AddressUnspent } from '@defichain/whale-api-client/dist/api/address';
import { Prevout } from '@defichain/jellyfish-transaction-builder';
import BigNumber from 'bignumber.js';
import { SmartBuffer } from 'smart-buffer';
import { toOPCodes } from '@defichain/jellyfish-transaction';
import { Injectable } from '@nestjs/common';
import { Config } from 'src/config/config';
import { UtxoSizePriority } from '../domain/enums';
import { UtxoInformation } from '../domain/entities/utxo-information';
import { UtxoConfig } from '../domain/entities/utxo-config';
import { UtxoManagerService } from './utxo-manager.service';

@Injectable()
export class UtxoProviderService {
  constructor(private readonly utxoManager: UtxoManagerService) {}

  async retrieveAllUnspent(address: string): Promise<AddressUnspent[]> {
    return this.utxoManager.get(address);
  }

  async addressHasUtxoExactAmount(address: string, amount: BigNumber): Promise<boolean> {
    const unspent = await this.retrieveAllUnspent(address);
    return unspent.some((u) => amount.isEqualTo(new BigNumber(u.vout.value)));
  }

  async provideExactAmount(address: string, amount: BigNumber, lock: boolean): Promise<UtxoInformation> {
    return this.provide(address, lock, (unspent) => UtxoProviderService.provideExactAmount(address, unspent, amount));
  }

  async provideUntilAmount(
    address: string,
    amount: BigNumber,
    lock: boolean,
    config: UtxoConfig,
  ): Promise<UtxoInformation> {
    return this.provide(address, lock, (unspent) => UtxoProviderService.provideUntilAmount(unspent, amount, config));
  }

  async provideNumber(
    address: string,
    numberOfUtxos: number,
    lock: boolean,
    config: UtxoConfig,
  ): Promise<UtxoInformation> {
    return this.provide(address, lock, (unspent) => UtxoProviderService.provideNumber(unspent, numberOfUtxos, config));
  }

  async provideForDefiTx(address: string, lock: boolean): Promise<UtxoInformation> {
    return this.provide(address, lock, (unspent) =>
      UtxoProviderService.provideUntilAmount(unspent, new BigNumber(0), {
        useFeeBuffer: true,
        sizePriority: UtxoSizePriority.FITTING,
        customFeeBuffer: Config.blockchain.minDefiTxFeeBuffer,
      }),
    );
  }

  async unlockSpentBasedOn(address: string, prevouts: Prevout[]): Promise<void> {
    await this.utxoManager.unlock(address, prevouts);
  }

  // --- HELPER METHODS --- //
  private async provide(
    address: string,
    lock: boolean,
    utxoFilter: (unspent: AddressUnspent[]) => AddressUnspent[],
  ): Promise<UtxoInformation> {
    const unspent = await this.retrieveAllUnspent(address);
    const used = utxoFilter(unspent);

    await this.utxoManager.lock(address, used, !lock);

    return UtxoProviderService.parseUnspent(used);
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
    config: UtxoConfig,
  ): AddressUnspent[] {
    const amountPlusFeeBuffer = amount.plus(config.customFeeBuffer ?? Config.blockchain.minFeeBuffer);
    const wantedAmount = config.useFeeBuffer ? amountPlusFeeBuffer : amount;
    let [neededUnspent, total] = UtxoProviderService.tryProvideUntilAmount(unspent, wantedAmount, config);
    if (total.lt(wantedAmount) && config.sizePriority === UtxoSizePriority.FITTING) {
      [neededUnspent, total] = UtxoProviderService.tryProvideUntilAmount(unspent, wantedAmount, {
        ...config,
        sizePriority: UtxoSizePriority.BIG,
      });
    }
    if (total.lt(wantedAmount))
      throw new Error(
        `Not enough available liquidity for requested amount.\nTotal available: ${total}\nRequested amount: ${wantedAmount}`,
      );
    if (neededUnspent.length > Config.utxo.maxInputs)
      throw new Error(`Exceeding amount of max allowed inputs of ${Config.utxo.maxInputs}`);
    return neededUnspent;
  }

  private static tryProvideUntilAmount(
    unspent: AddressUnspent[],
    amountPlusFeeBuffer: BigNumber,
    { sizePriority }: UtxoConfig,
  ): [AddressUnspent[], BigNumber] {
    const neededUnspent: AddressUnspent[] = [];
    let total = new BigNumber(0);
    unspent = unspent.sort(sizePriority === UtxoSizePriority.BIG ? this.orderDescending : this.orderAscending);
    if (sizePriority === UtxoSizePriority.FITTING) {
      unspent = unspent.filter((u) => new BigNumber(u.vout.value).gte(amountPlusFeeBuffer));
    }
    unspent.forEach((u) => {
      if (total.gte(amountPlusFeeBuffer)) return;
      neededUnspent.push(u);
      total = total.plus(u ? new BigNumber(u.vout.value) : 0);
    });
    return [neededUnspent, total];
  }

  private static provideNumber(
    unspent: AddressUnspent[],
    numberOfUtxos: number,
    { sizePriority }: UtxoConfig,
  ): AddressUnspent[] {
    unspent = unspent.sort(sizePriority === UtxoSizePriority.BIG ? this.orderDescending : this.orderAscending);
    return unspent.slice(0, numberOfUtxos);
  }

  private static orderAscending(a: AddressUnspent, b: AddressUnspent): number {
    return new BigNumber(a.vout.value).minus(new BigNumber(b.vout.value)).toNumber();
  }

  static orderDescending(a: AddressUnspent, b: AddressUnspent): number {
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
          stack: toOPCodes(SmartBuffer.fromBuffer(Buffer.from(item.script.hex, 'hex'))),
        },
        tokenId: item.vout.tokenId ?? 0x00,
      };
    });
    return { prevouts, scriptHex, total };
  }
}
