import { AddressUnspent as JellyfishAddressUnspent } from '@defichain/whale-api-client/dist/api/address';
import { Prevout } from '@defichain/jellyfish-transaction-builder';
import BigNumber from 'bignumber.js';
import { SmartBuffer } from 'smart-buffer';
import { toOPCodes } from '@defichain/jellyfish-transaction';
import { WhaleClient } from '../../whale/whale-client';
import { WhaleService } from '../../whale/whale.service';
import { Injectable } from '@nestjs/common';
import { Config } from 'src/config/config';
import { Util } from 'src/shared/util';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Lock } from 'src/shared/lock';
import { UtxoSizePriority } from '../domain/enums';
import { UtxoInformation } from '../domain/entities/utxo-information';
import { UtxoConfig } from '../domain/entities/utxo-config';

interface AddressUnspent extends JellyfishAddressUnspent {
  id: string;
}

interface BlockedUtxo {
  unlockAt: Date;
  unspent: AddressUnspent;
  address: string;
}

@Injectable()
export class UtxoProviderService {
  private readonly lockUtxo = new Lock(1800);
  private addressToBlockHeight = new Map<string, number>();
  private unspent = new Map<string, AddressUnspent[]>();
  private spent = new Map<string, BlockedUtxo[]>();

  private whaleClient?: WhaleClient;

  constructor(whaleService: WhaleService) {
    whaleService.getClient().subscribe((client) => (this.whaleClient = client));
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async doUnlockChecks() {
    if (!this.lockUtxo.acquire()) return;

    try {
      for (const [address, blockedUtxos] of this.spent) {
        this.spent.set(
          address,
          blockedUtxos.filter((b) => b.unlockAt > new Date()),
        );
      }
    } catch (e) {
      console.error('Exception during unlocking utxos cronjob:', e);
    }

    this.lockUtxo.release();
  }

  unlockSpentBasedOn(prevouts: Prevout[], address: string): void {
    const idsToUnlock = prevouts.map(UtxoProviderService.idForPrevout);
    console.info(`unlock ${address}: to unlock ${idsToUnlock}`);
    const spentToUnlock = this.spent
      .get(address)
      ?.filter((blocked) => idsToUnlock.includes(blocked.unspent.id))
      .map((blocked) => blocked.unspent);
    this.unspent.set(address, (this.unspent.get(address) ?? []).concat(spentToUnlock));
    const newSpent = this.spent.get(address)?.filter((blocked) => !idsToUnlock.includes(blocked.unspent.id));
    this.spent.set(address, newSpent);
    console.info(`unlock ${address}: unspent ${Array.from(this.unspent.get(address)).map((unspent) => unspent.id)}`);
    console.info(
      `unlock ${address}: spent ${Array.from(this.spent.get(address) ?? []).map((blocked) => blocked.unspent.id)}`,
    );
  }

  async addressHasUtxoExactAmount(address: string, amount: BigNumber): Promise<boolean> {
    const unspent = await this.retrieveUnspent(address);
    return unspent.find((u) => amount.isEqualTo(new BigNumber(u.vout.value))) != null;
  }

  async provideExactAmount(address: string, amount: BigNumber): Promise<UtxoInformation> {
    const unspent = await this.retrieveUnspent(address);
    return UtxoProviderService.parseUnspent(
      this.markUsed(address, UtxoProviderService.provideExactAmount(address, unspent, amount)),
    );
  }

  async provideUntilAmount(address: string, amount: BigNumber, config: UtxoConfig): Promise<UtxoInformation> {
    const unspent = await this.retrieveUnspent(address);
    return UtxoProviderService.parseUnspent(
      this.markUsed(address, UtxoProviderService.provideUntilAmount(unspent, amount, config)),
    );
  }

  async provideNumber(address: string, numberOfUtxos: number, config: UtxoConfig): Promise<UtxoInformation> {
    const unspent = await this.retrieveUnspent(address);
    return UtxoProviderService.parseUnspent(
      this.markUsed(address, UtxoProviderService.provideNumber(unspent, numberOfUtxos, config)),
    );
  }

  async provideForDefiTx(address: string): Promise<UtxoInformation> {
    const unspent = await this.retrieveUnspent(address);
    return UtxoProviderService.parseUnspent(
      this.markUsed(
        address,
        UtxoProviderService.provideUntilAmount(unspent, new BigNumber(0), {
          useFeeBuffer: true,
          sizePriority: UtxoSizePriority.FITTING,
          customFeeBuffer: Config.blockchain.minDefiTxFeeBuffer,
        }),
      ),
    );
  }

  async retrieveAllUnspent(address: string): Promise<AddressUnspent[]> {
    return this.retrieveUnspent(address);
  }

  // --- HELPER METHODS --- //
  private markUsed(address: string, unspent: AddressUnspent[]): AddressUnspent[] {
    console.info(`lock ${address}: locking ${unspent.map((unspent) => unspent.id)}`);
    const newSpent = unspent.map((u) => {
      return { unlockAt: Util.hoursAfter(1), unspent: u, address };
    });
    this.spent.set(address, (this.spent.get(address) ?? []).concat(newSpent));
    this.unspent.set(
      address,
      this.unspent.get(address)?.filter((u) => !unspent.map((us) => us.id).includes(u.id)),
    );
    console.info(`lock ${address}: unspent ${Array.from(this.unspent.get(address)).map((unspent) => unspent.id)}`);
    console.info(
      `lock ${address}: spent ${Array.from(this.spent.get(address) ?? []).map((blocked) => blocked.unspent.id)}`,
    );
    return unspent;
  }

  private async retrieveUnspent(address: string): Promise<AddressUnspent[]> {
    await this.checkBlockAndInvalidate(address);
    return this.unspent.get(address);
  }

  private async checkBlockAndInvalidate(address: string) {
    const storedBlockHeight = this.addressToBlockHeight.get(address);
    const currentBlockHeight = await this.whaleClient.getBlockHeight();
    console.info(`update ${address}: stored block ${storedBlockHeight} blockchain block ${currentBlockHeight}`);
    if (storedBlockHeight === currentBlockHeight) return;

    this.addressToBlockHeight.set(address, currentBlockHeight);

    const currentUnspent = await this.whaleClient
      .getAllUnspent(address)
      .then((unspent) => unspent.map((u) => ({ ...u, id: UtxoProviderService.idForUnspent(u) })));
    this.unspent.set(
      address,
      currentUnspent.filter(
        (u) => !(this.spent.get(address) ?? []).map((blocked) => blocked.unspent.id).includes(u.id),
      ),
    );
    console.info(`update ${address}: unspent ${Array.from(this.unspent.get(address)).map((unspent) => unspent.id)}`);
    console.info(
      `update ${address}: spent ${Array.from(this.spent.get(address) ?? []).map((blocked) => blocked.unspent.id)}`,
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

  private static idForUnspent(unspent: AddressUnspent): string {
    return `${unspent.vout.txid}|${unspent.vout.n}`;
  }

  private static idForPrevout(prevout: Prevout): string {
    return `${prevout.txid}|${prevout.vout}`;
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
          // TODO(fuxingloh): needs to refactor once jellyfish refactor this.
          stack: toOPCodes(SmartBuffer.fromBuffer(Buffer.from(item.script.hex, 'hex'))),
        },
        tokenId: item.vout.tokenId ?? 0x00,
      };
    });
    return { prevouts, scriptHex, total };
  }
}
