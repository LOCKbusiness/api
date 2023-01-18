import { Injectable } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { BehaviorSubject, Observable } from 'rxjs';
import { WhaleClient } from './whale-client';

@Injectable()
export class WhaleService {
  readonly #client: BehaviorSubject<WhaleClient>;

  constructor(scheduler: SchedulerRegistry) {
    this.#client = new BehaviorSubject(new WhaleClient(scheduler));
  }

  getClient(): Observable<WhaleClient> {
    return this.#client.asObservable();
  }
}
