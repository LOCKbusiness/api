import { Injectable } from '@nestjs/common';
import { MasternodeOwnerDto } from '../dto/masternode-owner.dto';
import * as LocOwners from '../repositories/owner-loc.json';
import * as DevOwners from '../repositories/owner-dev.json';
import * as PrdOwners from '../repositories/owner-prd.json';
import { Config } from 'src/config/config';

@Injectable()
export class MasternodeOwnerService {
  provide(amount: number, lastUsedOwner?: string): MasternodeOwnerDto[] {
    const indexOfBegin = this.ownersAsList().findIndex((owner) => owner.address === lastUsedOwner) + 1;
    return this.ownersAsList().slice(indexOfBegin, indexOfBegin + amount);
  }

  private ownersAsList(): MasternodeOwnerDto[] {
    switch (Config.environment) {
      case 'loc':
        return LocOwners as MasternodeOwnerDto[];
      case 'dev':
        return DevOwners as MasternodeOwnerDto[];
      case 'prd':
        return PrdOwners as MasternodeOwnerDto[];
    }
  }
}
