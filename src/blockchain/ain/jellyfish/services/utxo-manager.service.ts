import { AddressUnspent } from '@defichain/whale-api-client/dist/api/address';
import { Prevout } from '@defichain/jellyfish-transaction-builder';
import { WhaleClient } from '../../whale/whale-client';
import { WhaleService } from '../../whale/whale.service';
import { Injectable } from '@nestjs/common';
import { UtxoReservationService } from './utxo-reservation.service';
import { Util } from 'src/shared/util';

interface UnspentCacheEntry {
  updatedHeight: number;
  unspent: AddressUnspent[];
}

@Injectable()
export class UtxoManagerService {
  private readonly unspent = new Map<string, UnspentCacheEntry>();

  private whaleClient?: WhaleClient;

  constructor(private readonly utxoReservationService: UtxoReservationService, whaleService: WhaleService) {
    whaleService.getClient().subscribe((client) => (this.whaleClient = client));
  }

  async get(address: string): Promise<AddressUnspent[]> {
    await this.updateCacheIfRequired(address);

    const { unspent } = this.getFor(address);
    const reserved = this.utxoReservationService.get(address);

    return unspent.filter((u) => !reserved.includes(this.idForUnspent(u)));
  }

  async lock(address: string, utxos: AddressUnspent[], tempLock: boolean): Promise<void> {
    const expires = tempLock ? Util.minutesAfter(5) : Util.daysAfter(7);
    const ids = utxos.map(this.idForUnspent);
    await this.utxoReservationService.lock(address, ids, expires);
  }

  async unlock(address: string, utxos: Prevout[]): Promise<string[]> {
    const ids = utxos.map(this.idForPrevout);
    return this.utxoReservationService.unlock(address, ids);
  }

  // --- HELPER METHODS --- //
  private getFor(address: string): UnspentCacheEntry {
    return this.unspent.get(address) ?? { updatedHeight: undefined, unspent: [] };
  }

  private async updateCacheIfRequired(address: string) {
    const { updatedHeight } = this.getFor(address);
    const currentBlockHeight = this.whaleClient.currentBlockHeight;
    if (updatedHeight === currentBlockHeight) return;

    // update unspent
    const currentUnspent = await this.whaleClient.getAllUnspent(address);
    this.unspent.set(address, { updatedHeight: currentBlockHeight, unspent: currentUnspent });

    // delete spent reserved
    const reserved = this.utxoReservationService.get(address);
    const spent = reserved.filter((r) => !currentUnspent.some((u) => this.idForUnspent(u) === r));
    if (spent.length > 0) await this.utxoReservationService.unlock(address, spent);
  }

  private idForUnspent(unspent: AddressUnspent): string {
    return `${unspent.vout.txid}|${unspent.vout.n}`;
  }

  private idForPrevout(prevout: Prevout): string {
    return `${prevout.txid}|${prevout.vout}`;
  }
}
