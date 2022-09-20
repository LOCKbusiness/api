import { Controller, UseGuards, Body, Post, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { UserRole } from 'src/shared/auth/user-role.enum';
import { Staking } from '../../domain/entities/staking.entity';
import { GetJwt } from 'src/shared/auth/get-jwt.decorator';
import { JwtPayload } from 'src/shared/auth/jwt-payload.interface';
import { StakingRewardService } from '../../application/services/staking-reward.service';
import { CreateRewardDto } from '../../application/dto/create-reward.dto';

@ApiTags('reward')
@Controller('staking/:stakingId/reward')
export class DepositController {
  constructor(private readonly stakingRewardService: StakingRewardService) {}

  @Post()
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(UserRole.USER))
  async addDeposit(
    @GetJwt() jwt: JwtPayload,
    @Param('stakingId') stakingId: string,
    @Body() dto: CreateRewardDto,
  ): Promise<Staking> {
    return this.stakingRewardService.createReward(jwt.id, stakingId, dto);
  }
}
