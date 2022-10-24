import { Injectable } from '@nestjs/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { WhaleClient } from './whale-client';

@Injectable()
export class WhaleService {
  readonly #client: BehaviorSubject<WhaleClient>;

  constructor() {
    this.#client = new BehaviorSubject(new WhaleClient());
  }

  getClient(): Observable<WhaleClient> {
    return this.#client.asObservable();
  }
}
