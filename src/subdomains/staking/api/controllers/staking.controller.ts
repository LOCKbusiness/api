import { Controller, UseGuards, Body, Post, Get, Param, Patch } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { StakingService } from '../../application/services/staking.service';
import { GetJwt } from 'src/shared/auth/get-jwt.decorator';
import { JwtPayload } from 'src/shared/auth/jwt-payload.interface';
import { StakingOutputDto } from '../../application/dto/output/staking.output.dto';
import { CreateStakingDto } from '../../application/dto/input/create-staking.dto';
import { SetStakingFeeDto } from '../../application/dto/input/set-staking-fee.dto';
import { GetStakingDto } from '../../application/dto/input/get-staking.dto';

@ApiTags('staking')
@Controller('staking')
export class StakingController {
  constructor(private readonly stakingService: StakingService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.USER))
  @ApiResponse({ status: 201, type: StakingOutputDto })
  async createStaking(@GetJwt() jwt: JwtPayload, @Body() dto: CreateStakingDto): Promise<StakingOutputDto> {
    return this.stakingService.createStaking(jwt.userId, jwt.walletId, dto);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.USER))
  @ApiResponse({ status: 200, type: StakingOutputDto })
  async getStaking(@GetJwt() jwt: JwtPayload, @Body() dto: GetStakingDto): Promise<StakingOutputDto> {
    return this.stakingService.getStaking(jwt.userId, jwt.walletId, dto);
  }

  @Patch(':id/staking-fee')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.ADMIN))
  async setStakingFee(@Param('id') stakingId: string, @Body() dto: SetStakingFeeDto): Promise<void> {
    return this.stakingService.setStakingFee(+stakingId, dto);
  }
}
