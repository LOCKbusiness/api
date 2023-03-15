import { Injectable } from '@nestjs/common';
import { MasternodeOwnerDto } from '../dto/masternode-owner.dto';
import LocOwners from '../repositories/owner-loc.json';
import DevOwners from '../repositories/owner-dev.json';
import StgOwners from '../repositories/owner-stg.json';
import PrdOwners from '../repositories/owner-prd.json';
import { Config } from 'src/config/config';

@Injectable()
export class MasternodeOwnerService {
  provide(amount: number, usedOwners: string[]): MasternodeOwnerDto[] {
    const filteredList = MasternodeOwnerService.ownersAsList().filter((owner) => !usedOwners.includes(owner.address));
    return filteredList.slice(0, amount);
  }

  static isOnList(owner: string): boolean {
    return this.ownersAsList().find((o) => o.address === owner) !== undefined;
  }

  private static ownersAsList(): MasternodeOwnerDto[] {
    switch (Config.environment) {
      case 'loc':
        return LocOwners as MasternodeOwnerDto[];
      case 'dev':
        return DevOwners as MasternodeOwnerDto[];
      case 'stg':
        return StgOwners as MasternodeOwnerDto[];
      case 'prd':
        return PrdOwners as MasternodeOwnerDto[];
    }
  }
}
