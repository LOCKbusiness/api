import { Injectable } from '@nestjs/common';
import { Country } from '../../domain/entities/country.entity';
import { CountryRepository } from '../repositories/country.repository';

@Injectable()
export class CountryService {
  constructor(private countryRepo: CountryRepository) {}

  async getAllCountry(): Promise<Country[]> {
    return this.countryRepo.find();
  }

  async getCountry(id: number): Promise<Country> {
    return this.countryRepo.findOne(id);
  }

  async getCountryWithSymbol(symbol: string): Promise<Country> {
    return this.countryRepo.findOne({ where: { symbol } });
  }
}
