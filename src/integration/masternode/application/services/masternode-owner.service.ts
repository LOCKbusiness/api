import { Injectable } from '@nestjs/common';
import { MasternodeOwnerDto } from '../dto/masternode-owner.dto';
import * as MasternodeOwners from '../repositories/owner.json';

@Injectable()
export class MasternodeOwnerService {
  provide(amount: number, lastUsedOwner?: string): MasternodeOwnerDto[] {
    const indexOfBegin = this.ownersAsList().findIndex((owner) => owner.address === lastUsedOwner) + 1;
    return this.ownersAsList().slice(indexOfBegin, indexOfBegin + amount);
  }

  private ownersAsList(): MasternodeOwnerDto[] {
    return MasternodeOwners as MasternodeOwnerDto[];
  }
}
