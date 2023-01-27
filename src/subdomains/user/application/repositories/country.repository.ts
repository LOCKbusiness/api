import { Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { Country } from '../../domain/entities/country.entity';

@Injectable()
export class CountryRepository extends Repository<Country> {
  constructor(manager: EntityManager) {
    super(Country, manager);
  }
}
