import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Config } from 'src/config/config';
import { User } from '../../domain/entities/user.entity';
import { KycStatus } from '../../domain/enums';
import { KycDataDto } from '../dto/kyc-data.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
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

  async updateUser(userDataId: number, dto: KycDataDto): Promise<User> {
    const user = await this.userRepo.findOne(userDataId);
    if (!user) throw new NotFoundException('User data not found');
    return await this.userRepo.save({ ...user, ...dto });
  }

  async getUser(userId: number): Promise<User> {
    return this.userRepo.findOne({ where: { id: userId }, relations: ['wallets'] });
  }

  async getAllUser(): Promise<User[]> {
    return await this.userRepo.find();
  }

  async getKycStatus(userId: number): Promise<KycStatus> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    return user.kycStatus;
  }
}
