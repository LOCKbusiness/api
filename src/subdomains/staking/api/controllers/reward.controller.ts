import { Controller, UseGuards, Body, Post, Param, Put } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { StakingRewardService } from '../../application/services/staking-reward.service';
import { CreateRewardDto } from '../../application/dto/input/create-reward.dto';
import { UpdateRewardDto } from '../../application/dto/input/update-reward.dto';
import { Reward } from '../../domain/entities/reward.entity';

@ApiTags('Reward')
@Controller('staking/:stakingId/reward')
export class RewardController {
  constructor(private readonly stakingRewardService: StakingRewardService) {}

  @Post()
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.ADMIN))
  async createReward(@Param('stakingId') stakingId: string, @Body() dto: CreateRewardDto): Promise<void> {
    await this.stakingRewardService.createReward(+stakingId, dto);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.ADMIN))
  async updateReward(@Param('id') id: string, @Body() dto: UpdateRewardDto): Promise<Reward> {
    return this.stakingRewardService.updateReward(+id, dto);
  }
}
