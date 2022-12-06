import { Injectable, NotFoundException } from '@nestjs/common';
import { Config } from 'src/config/config';
import { WalletBlockchainAddress } from '../../domain/entities/wallet-blockchain-address.entity';
import { User } from '../../domain/entities/user.entity';
import { KycStatus } from '../../domain/enums';
import { UserRepository } from '../repositories/user.repository';
import { getCustomRepository, IsNull, Not } from 'typeorm';
import { Votes } from 'src/subdomains/voting/application/dto/votes.dto';

@Injectable()
export class UserService {
  constructor(private readonly userRepo: UserRepository) {}
  async createUser(): Promise<User> {
    return await this.userRepo.save({
      language: Config.defaultLanguage,
    });
  }

  async updateUser(userId: number, dto: Partial<User>): Promise<User> {
    const user = await this.userRepo.findOne(userId);
    if (!user) throw new NotFoundException('User not found');
    return await this.userRepo.save(Object.assign(user, dto));
  }

  async getUser(userId: number): Promise<User> {
    return this.userRepo.findOne({ where: { id: userId }, relations: ['wallets'] });
  }

  async getUserByKycId(kycId: string): Promise<User> {
    return this.userRepo.findOne({ where: { kycId } });
  }

  async getUserByAddress(address: string): Promise<User> {
    return await getCustomRepository(UserRepository)
      .createQueryBuilder('user')
      .innerJoin('user.wallets', 'wallets')
      .innerJoin('wallets.address', 'address')
      .where('address = :address', { address })
      .getOne();
  }

  async getAllUser(): Promise<User[]> {
    return await this.userRepo.find();
  }

  async getKycStatus(userId: number): Promise<KycStatus> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    return user.kycStatus;
  }

  async canStake(userId: number, walletId: number): Promise<boolean> {
    const user = await this.userRepo.findOne(userId, { relations: ['wallets', 'wallets.walletProvider'] });
    const minKycStatus =
      user.wallets.find((w) => w.id === walletId)?.walletProvider.minStakingKycStatus ?? KycStatus.NA;

    return user.hasAtLeast(minKycStatus);
  }

  async getWalletAddress(userId: number, walletId: number): Promise<WalletBlockchainAddress> {
    const user = await this.userRepo.findOne({ where: { id: userId }, relations: ['wallets', 'wallets.address'] });

    return user.wallets.find((w) => w.id === walletId).address;
  }

  // --- VOTES --- //

  async getVotes(id: number): Promise<Votes> {
    return this.userRepo.findOne({ id }, { select: ['id', 'votes'] }).then((u) => (u.votes ? JSON.parse(u.votes) : {}));
  }

  async updateVotes(id: number, votes: Votes): Promise<Votes> {
    await this.userRepo.update(id, { votes: JSON.stringify(votes) });
    return votes;
  }

  async getAllUserWithVotes(): Promise<User[]> {
    return await this.userRepo.find({ votes: Not(IsNull()) });
  }
}
