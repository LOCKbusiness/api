import { EntityRepository, Repository } from 'typeorm';
import { Country } from '../../domain/entities/country.entity';

@EntityRepository(Country)
export class CountryRepository extends Repository<Country> {}
