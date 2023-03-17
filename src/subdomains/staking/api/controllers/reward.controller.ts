import { Controller, UseGuards, Body, Param, Put, Post, Get, Query, Patch } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { StakingRewardService } from '../../application/services/staking-reward.service';
import { UpdateRewardDto } from '../../application/dto/input/update-reward.dto';
import { Reward } from '../../domain/entities/reward.entity';
import { SetRewardsStatusDto } from '../../application/dto/input/set-rewards-status.dto';

@ApiTags('Reward')
@Controller('staking/reward')
export class RewardController {
  constructor(private readonly stakingRewardService: StakingRewardService) {}

  @Get('volume')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.ADMIN))
  async getRewardVolume(@Query('date') date: string): Promise<number> {
    return this.stakingRewardService.getRewardVolumeAt(new Date(date));
  }

  @Post()
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.ADMIN))
  async createDailyRewards(): Promise<Reward[]> {
    return this.stakingRewardService.createDailyRewards();
  }

  @Patch('status')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.ADMIN))
  async setRewardsStatus(@Body() dto: SetRewardsStatusDto): Promise<void> {
    return this.stakingRewardService.setRewardsStatus(dto);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.ADMIN))
  async updateReward(@Param('id') id: string, @Body() dto: UpdateRewardDto): Promise<Reward> {
    return this.stakingRewardService.updateReward(+id, dto);
  }
}
