import { Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { Country } from '../models/country.entity';

@Injectable()
export class CountryRepository extends Repository<Country> {
  constructor(manager: EntityManager) {
    super(Country, manager);
  }
}
