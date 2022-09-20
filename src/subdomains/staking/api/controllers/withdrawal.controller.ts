import { Controller, UseGuards, Body, Post, Param, Patch } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { UserRole } from 'src/shared/auth/user-role.enum';
import { Staking } from '../../domain/entities/staking.entity';
import { GetJwt } from 'src/shared/auth/get-jwt.decorator';
import { JwtPayload } from 'src/shared/auth/jwt-payload.interface';
import { StakingWithdrawalService } from '../../application/services/staking-withdrawal.service';
import { ConfirmWithdrawalDto } from '../../application/dto/input/confirm-withdrawal.dto';
import { CreateWithdrawalDto } from '../../application/dto/input/create-withdrawal.dto';

@ApiTags('withdrawal')
@Controller('staking/:stakingId/withdrawal')
export class DepositController {
  constructor(private readonly stakingWithdrawalService: StakingWithdrawalService) {}

  @Post()
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(UserRole.USER))
  async createWithdrawal(
    @GetJwt() jwt: JwtPayload,
    @Param('stakingId') stakingId: string,
    @Body() dto: CreateWithdrawalDto,
  ): Promise<Staking> {
    return this.stakingWithdrawalService.createWithdrawal(jwt.id, stakingId, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(UserRole.USER))
  async payoutWithdrawal(
    @GetJwt() jwt: JwtPayload,
    @Param('stakingId') stakingId: string,
    @Param('id') withdrawalId: string,
  ): Promise<Staking> {
    return this.stakingWithdrawalService.payoutWithdrawal(jwt.id, stakingId, withdrawalId);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(UserRole.USER))
  async confirmWithdrawal(
    @GetJwt() jwt: JwtPayload,
    @Param('stakingId') stakingId: string,
    @Param('id') withdrawalId: string,
    @Body() dto: ConfirmWithdrawalDto,
  ): Promise<Staking> {
    return this.stakingWithdrawalService.confirmWithdrawal(jwt.id, stakingId, withdrawalId, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(UserRole.USER))
  async failWithdrawal(
    @GetJwt() jwt: JwtPayload,
    @Param('stakingId') stakingId: string,
    @Param('id') withdrawalId: string,
  ): Promise<Staking> {
    return this.stakingWithdrawalService.failWithdrawal(jwt.id, stakingId, withdrawalId);
  }
}
