import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from 'src/subdomains/user/application/services/user.service';

@Injectable()
export class StakingKycCheckService {
  constructor(private readonly userService: UserService) {}

  async check(userId: number): Promise<void> {
    const isKycSuccessful = await this.userService.isKycSuccessful(userId);

    if (!isKycSuccessful) throw new UnauthorizedException();
  }
}
