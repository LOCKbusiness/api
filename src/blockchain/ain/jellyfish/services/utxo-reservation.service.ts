import { Injectable, OnModuleInit } from '@nestjs/common';
import { Util } from 'src/shared/util';
import { In, LessThan } from 'typeorm';
import { UtxoReservationRepository } from '../repositories/utxo-reservation.repository';
import { UtxoReservation } from '../domain/utxo-reservation.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Lock } from 'src/shared/lock';

@Injectable()
export class UtxoReservationService implements OnModuleInit {
  private cache = new Map<string, string[]>();

  constructor(private readonly repo: UtxoReservationRepository) {}

  onModuleInit() {
    void this.load();
  }

  get(address: string): string[] {
    return this.cache.get(address) ?? [];
  }

  async lock(address: string, utxos: string[]): Promise<string[]> {
    // update cache
    const allLocked = this.get(address).concat(utxos);
    this.cache.set(address, allLocked);

    // update DB
    const entities = utxos.map((utxo) => this.repo.create({ address, utxo }));
    await this.repo.save(entities);

    return allLocked;
  }

  async unlock(address: string, utxos: string[]): Promise<string[]> {
    // update cache
    const allLocked = this.get(address).filter((u) => !utxos.includes(u));
    this.cache.set(address, allLocked);

    // update DB
    await this.repo.delete({ address, utxo: In(utxos) });

    return allLocked;
  }

  // --- JOBS --- //
  @Cron(CronExpression.EVERY_HOUR)
  @Lock()
  async cleanupOldReservations() {
    await this.repo.delete({ updated: LessThan(Util.daysBefore(7)) });
  }

  // --- HELPER METHODS --- //
  private async load() {
    const allUtxos = await this.repo.find();
    const map = Util.groupBy<UtxoReservation, string>(allUtxos, 'address');

    for (const [address, utxos] of map.entries()) {
      this.cache.set(
        address,
        utxos.map((r) => r.utxo),
      );
    }
  }
}
