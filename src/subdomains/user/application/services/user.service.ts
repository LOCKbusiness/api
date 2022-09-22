import { Injectable, NotFoundException } from '@nestjs/common';
import { Config } from 'src/config/config';
import { UserBlockchainAddress } from '../../domain/entities/user-blockchain-address.entity';
import { User } from '../../domain/entities/user.entity';
import { KycStatus } from '../../domain/enums';
import { UserRepository } from '../repositories/user.repository';
import { CountryService } from './country.service';

@Injectable()
export class UserService {
  constructor(private readonly userRepo: UserRepository, private readonly countryService: CountryService) {}
  async createUser(): Promise<User> {
    return await this.userRepo.save({
      language: Config.defaultLanguage,
    });
  }

  async updateUser(userId: number, dto: Partial<User>): Promise<User> {
    const user = await this.userRepo.findOne(userId);
    if (!user) throw new NotFoundException('User not found');
    return await this.userRepo.save({ ...user, ...dto });
  }

  async getUser(userId: number): Promise<User> {
    return this.userRepo.findOne({ where: { id: userId }, relations: ['wallets'] });
  }

  async getUserByKycId(kycId: string): Promise<User> {
    return this.userRepo.findOne({ where: { kycId } });
  }

  async getAllUser(): Promise<User[]> {
    return await this.userRepo.find();
  }

  async getKycStatus(userId: number): Promise<KycStatus> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    return user.kycStatus;
  }

  async getWalletAddress(userId: number): Promise<UserBlockchainAddress> {
    const user = await this.userRepo.findOne({ where: { id: userId }, relations: ['wallets'] });

    // TODO - implement User Address fetch
    return null;
  }
}
