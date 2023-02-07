import { Controller, UseGuards, Body, Param, Get, Put, ParseArrayPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { GetJwt } from 'src/shared/auth/get-jwt.decorator';
import { JwtPayload } from 'src/shared/auth/jwt-payload.interface';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { CreateRewardRouteDto } from '../../application/dto/input/create-reward-route.dto';
import { RewardRouteOutputDto } from '../../application/dto/output/reward-route.output.dto';
import { StakingOutputDto } from '../../application/dto/output/staking.output.dto';
import { StakingRewardService } from '../../application/services/staking-reward.service';

@ApiTags('RewardRoutes')
@Controller('staking/:stakingId/reward-routes')
export class RewardRouteController {
  constructor(private readonly stakingRewardService: StakingRewardService) {}

  @Put()
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.USER))
  @ApiOkResponse({ type: StakingOutputDto })
  @ApiBody({ type: CreateRewardRouteDto, isArray: true })
  async setRewardRoutes(
    @GetJwt() jwt: JwtPayload,
    @Param('stakingId') stakingId: string,
    @Body(new ParseArrayPipe({ items: CreateRewardRouteDto })) dtos: CreateRewardRouteDto[],
  ): Promise<StakingOutputDto> {
    return this.stakingRewardService.setRewardRoutes(jwt.userId, +stakingId, dtos);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.USER))
  @ApiOkResponse({ type: RewardRouteOutputDto, isArray: true })
  async getRewardRoutes(
    @GetJwt() jwt: JwtPayload,
    @Param('stakingId') stakingId: string,
  ): Promise<RewardRouteOutputDto[]> {
    return this.stakingRewardService.getRewardRoutes(jwt.userId, +stakingId);
  }
}
