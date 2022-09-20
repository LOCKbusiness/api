import { Controller, UseGuards, Body, Post, Param, Patch } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { Staking } from '../../domain/entities/staking.entity';
import { GetJwt } from 'src/shared/auth/get-jwt.decorator';
import { JwtPayload } from 'src/shared/auth/jwt-payload.interface';
import { StakingWithdrawalService } from '../../application/services/staking-withdrawal.service';
import { ConfirmWithdrawalDto } from '../../application/dto/input/confirm-withdrawal.dto';
import { CreateWithdrawalDto } from '../../application/dto/input/create-withdrawal.dto';

@ApiTags('withdrawal')
@Controller('staking/:stakingId/withdrawal')
export class WithdrawalController {
  constructor(private readonly stakingWithdrawalService: StakingWithdrawalService) {}

  @Post()
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.USER))
  async createWithdrawal(
    @GetJwt() jwt: JwtPayload,
    @Param('stakingId') stakingId: string,
    @Body() dto: CreateWithdrawalDto,
  ): Promise<Staking> {
    return this.stakingWithdrawalService.createWithdrawal(jwt.id, stakingId, dto);
  }

  @Patch(':id/designate-payout')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.ADMIN))
  async designateWithdrawalPayout(
    @GetJwt() jwt: JwtPayload,
    @Param('stakingId') stakingId: string,
    @Param('id') withdrawalId: string,
  ): Promise<Staking> {
    return this.stakingWithdrawalService.designateWithdrawalPayout(jwt.id, stakingId, withdrawalId);
  }

  @Patch(':id/confirm')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.ADMIN))
  async confirmWithdrawal(
    @GetJwt() jwt: JwtPayload,
    @Param('stakingId') stakingId: string,
    @Param('id') withdrawalId: string,
    @Body() dto: ConfirmWithdrawalDto,
  ): Promise<Staking> {
    return this.stakingWithdrawalService.confirmWithdrawal(jwt.id, stakingId, withdrawalId, dto);
  }

  @Patch(':id/fail')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.ADMIN))
  async failWithdrawal(
    @GetJwt() jwt: JwtPayload,
    @Param('stakingId') stakingId: string,
    @Param('id') withdrawalId: string,
  ): Promise<Staking> {
    return this.stakingWithdrawalService.failWithdrawal(jwt.id, stakingId, withdrawalId);
  }
}
