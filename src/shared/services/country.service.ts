import { Injectable } from '@nestjs/common';
import { Country } from '../models/country.entity';
import { CountryRepository } from '../repositories/country.repository';

@Injectable()
export class CountryService {
  constructor(private countryRepo: CountryRepository) {}

  async getAllCountry(): Promise<Country[]> {
    return this.countryRepo.find();
  }

  async getCountry(id: number): Promise<Country> {
    return this.countryRepo.findOneBy({ id });
  }

  async getCountryBySymbol(symbol: string): Promise<Country> {
    return this.countryRepo.findOneBy({ symbol });
  }
}
