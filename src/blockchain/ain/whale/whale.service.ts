import { Injectable } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { BehaviorSubject, Observable } from 'rxjs';
import { GetConfig } from 'src/config/config';
import { WhaleClient } from './whale-client';

export interface WhaleError {
  index: number;
  message: string;
}
@Injectable()
export class WhaleService {
  #client: BehaviorSubject<WhaleClient>;
  private readonly clients: WhaleClient[];

  constructor(scheduler: SchedulerRegistry) {
    this.clients = GetConfig().whale.urls.map((url, index) => new WhaleClient(scheduler, url, undefined, index));
    this.#client = new BehaviorSubject(this.clients[0]);
  }

  getClient(): Observable<WhaleClient> {
    return this.#client.asObservable();
  }

  getCurrentClient(): WhaleClient {
    return this.#client.value;
  }

  switchWhale(index: number): void {
    this.#client = new BehaviorSubject(this.clients[index]);
  }

  // --- HEALTH CHECK API --- //

  async checkWhales(): Promise<WhaleError[]> {
    return Promise.all(this.clients.map(async (client, i) => ({ message: await client.getHealth(), index: i })));
  }
}
