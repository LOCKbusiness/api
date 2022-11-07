import { Controller, UseGuards, Body, Get, Param, Patch, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { StakingService } from '../../application/services/staking.service';
import { GetJwt } from 'src/shared/auth/get-jwt.decorator';
import { JwtPayload } from 'src/shared/auth/jwt-payload.interface';
import { StakingOutputDto } from '../../application/dto/output/staking.output.dto';
import { SetStakingFeeDto } from '../../application/dto/input/set-staking-fee.dto';
import { GetOrCreateStakingQuery } from '../../application/dto/input/get-staking.query';
import { BalanceOutputDto } from '../../application/dto/output/balance.output.dto';

@ApiTags('Staking')
@Controller('staking')
export class StakingController {
  constructor(private readonly stakingService: StakingService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.USER))
  @ApiResponse({ status: 200, type: StakingOutputDto })
  async getStaking(@GetJwt() jwt: JwtPayload, @Query() query: GetOrCreateStakingQuery): Promise<StakingOutputDto> {
    return this.stakingService.getOrCreateStaking(jwt.userId, jwt.walletId, query);
  }

  @Get('balance')
  @ApiBearerAuth()
  @ApiResponse({ status: 200, type: BalanceOutputDto, isArray: true })
  async getStakingUserBalance(
    @Query('userAddress') userAddress: string,
    @Query('depositAddress') depositAddress: string,
  ): Promise<BalanceOutputDto[]> {
    if (depositAddress) return this.stakingService.getDepositAddressBalances(depositAddress);
    return this.stakingService.getUserAddressBalances(userAddress);
  }

  @Patch(':id/staking-fee')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.ADMIN))
  async setStakingFee(@Param('id') stakingId: string, @Body() dto: SetStakingFeeDto): Promise<void> {
    return this.stakingService.setStakingFee(+stakingId, dto);
  }
}
