import { AddressUnspent } from '@defichain/whale-api-client/dist/api/address';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { WhaleClient } from './whale-client';
@Injectable()
export class WhaleService {
  private readonly client: WhaleClient;

  constructor() {
    this.client = new WhaleClient();
  }

  getClient(): WhaleClient {
    if (!this.client) throw new InternalServerErrorException(`Whale client init failed`);
    return this.client;
  }

  async getUnspent(address: string, amountOfPrevouts: number, expectedAmount: BigNumber): Promise<AddressUnspent[]> {
    const unspent = await this.client.getUnspent(address);
    if (unspent.length != amountOfPrevouts)
      throw new Error('Could not parse unspent, wrong length. expected length of ' + amountOfPrevouts);

    const wantedUnspent = unspent.find((u) => new BigNumber(u.vout.value).isEqualTo(expectedAmount));

    if (!wantedUnspent) throw new Error(`Unspent on ${address} with amount of ${expectedAmount.toString()} not found`);
    return [wantedUnspent];
  }

  // TODO (Krysh) maybe we don't want to broadcast via ocean but rather via our own nodes
  async broadcast(tx: string): Promise<string> {
    const txId = await this.client.sendRaw(tx);
    return this.client.waitForTx(txId);
  }
}
