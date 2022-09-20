import { Controller, UseGuards, Body, Post, Get, Param, Patch } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { StakingService } from '../../application/services/staking.service';
import { Staking } from '../../domain/entities/staking.entity';
import { GetJwt } from 'src/shared/auth/get-jwt.decorator';
import { JwtPayload } from 'src/shared/auth/jwt-payload.interface';
import { StakingBalanceDto } from '../../application/dto/output/staking-balance.dto';
import { CreateStakingDto } from '../../application/dto/input/create-staking.dto';
import { SetStakingFeeDto } from '../../application/dto/input/set-staking-fee.dto';

@ApiTags('staking')
@Controller('staking')
export class StakingController {
  constructor(private readonly stakingService: StakingService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.USER))
  async createStaking(@GetJwt() jwt: JwtPayload, @Body() dto: CreateStakingDto): Promise<Staking> {
    return this.stakingService.createStaking(jwt.id, dto);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.USER))
  async getBalance(@GetJwt() jwt: JwtPayload, @Param('id') stakingId: string): Promise<StakingDto> {
    return this.stakingService.getBalance(jwt.id, stakingId);
  }

  // TODO - combine all in StakingDto
  // swagger the return detail ->
  @Get(':id/deposit-address')
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.USER))
  @ApiResponse({ status: 201, type: BankAccountDto })
  async getDepositAddress(@GetJwt() jwt: JwtPayload, @Param('id') stakingId: string): Promise<string> {
    return this.stakingService.getDepositAddress(jwt.id, stakingId);
  }

  @Get(':id/minimum-stake')
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.USER))
  async getMinimumStake(@GetJwt() jwt: JwtPayload, @Param('id') stakingId: string): Promise<number> {
    return this.stakingService.getMinimumStake(jwt.id, stakingId);
  }

  @Get(':id/minimum-deposit')
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.USER))
  async getMinimumDeposit(@GetJwt() jwt: JwtPayload, @Param('id') stakingId: string): Promise<number> {
    return this.stakingService.getMinimumDeposit(jwt.id, stakingId);
  }

  @Get(':id/staking-fee')
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.USER))
  async getStakingFee(@GetJwt() jwt: JwtPayload, @Param('id') stakingId: string): Promise<number> {
    return this.stakingService.getStakingFee(jwt.id, stakingId);
  }

  @Patch(':id/staking-fee')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.ADMIN))
  async setStakingFee(
    @GetJwt() jwt: JwtPayload,
    @Param('id') stakingId: string,
    @Body() dto: SetStakingFeeDto,
  ): Promise<void> {
    return this.stakingService.setStakingFee(jwt.id, stakingId, dto);
  }
}
