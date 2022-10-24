import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from 'src/subdomains/user/application/services/user.service';

@Injectable()
export class StakingKycCheckService {
  constructor(private readonly userService: UserService) {}

  async check(userId: number, walletId: number): Promise<void> {
    const canStake = await this.userService.canStake(userId, walletId);

    if (!canStake) throw new UnauthorizedException();
  }
}
