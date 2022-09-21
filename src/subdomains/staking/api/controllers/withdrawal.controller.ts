import { Controller, UseGuards, Body, Post, Param, Patch } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { GetJwt } from 'src/shared/auth/get-jwt.decorator';
import { JwtPayload } from 'src/shared/auth/jwt-payload.interface';
import { StakingWithdrawalService } from '../../application/services/staking-withdrawal.service';
import { ConfirmWithdrawalDto } from '../../application/dto/input/confirm-withdrawal.dto';
import { CreateWithdrawalDto } from '../../application/dto/input/create-withdrawal.dto';
import { StakingOutputDto } from '../../application/dto/output/staking.output.dto';

@ApiTags('withdrawal')
@Controller('staking/:stakingId/withdrawal')
export class WithdrawalController {
  constructor(private readonly stakingWithdrawalService: StakingWithdrawalService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.USER))
  @ApiResponse({ status: 200, type: StakingOutputDto })
  async createWithdrawal(
    @GetJwt() jwt: JwtPayload,
    @Param('stakingId') stakingId: string,
    @Body() dto: CreateWithdrawalDto,
  ): Promise<StakingOutputDto> {
    return this.stakingWithdrawalService.createWithdrawal(jwt.id, stakingId, dto);
  }

  //*** WEBHOOKS ***//

  @Patch(':id/designate-payout')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.STAKING_LIQUIDITY_MANAGER))
  @ApiResponse({ status: 200 })
  async designateWithdrawalPayout(
    @Param('stakingId') stakingId: string,
    @Param('id') withdrawalId: string,
  ): Promise<void> {
    await this.stakingWithdrawalService.designateWithdrawalPayout(stakingId, withdrawalId);
  }

  @Patch(':id/confirm')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.STAKING_PAYOUT_MANAGER))
  @ApiResponse({ status: 200 })
  async confirmWithdrawal(
    @Param('stakingId') stakingId: string,
    @Param('id') withdrawalId: string,
    @Body() dto: ConfirmWithdrawalDto,
  ): Promise<void> {
    await this.stakingWithdrawalService.confirmWithdrawal(stakingId, withdrawalId, dto);
  }

  @Patch(':id/fail')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(
    AuthGuard(),
    new RoleGuard(WalletRole.STAKING_LIQUIDITY_MANAGER),
    new RoleGuard(WalletRole.STAKING_PAYOUT_MANAGER),
  )
  @ApiResponse({ status: 200 })
  async failWithdrawal(@Param('stakingId') stakingId: string, @Param('id') withdrawalId: string): Promise<void> {
    await this.stakingWithdrawalService.failWithdrawal(stakingId, withdrawalId);
  }
}
