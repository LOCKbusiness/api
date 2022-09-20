import { Controller, UseGuards, Body, Post, Param, Patch } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { UserRole } from 'src/shared/auth/user-role.enum';
import { Staking } from '../../domain/entities/staking.entity';
import { GetJwt } from 'src/shared/auth/get-jwt.decorator';
import { JwtPayload } from 'src/shared/auth/jwt-payload.interface';
import { StakingDepositService } from '../../application/services/staking-deposit.service';
import { ConfirmDepositDto } from '../../application/dto/input/confirm-deposit.dto';
import { CreateDepositDto } from '../../application/dto/input/create-deposit.dto';

@ApiTags('deposit')
@Controller('staking/:stakingId/deposit')
export class DepositController {
  constructor(private readonly stakingDepositService: StakingDepositService) {}

  @Post()
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(UserRole.USER))
  async createDeposit(
    @GetJwt() jwt: JwtPayload,
    @Param('stakingId') stakingId: string,
    @Body() dto: CreateDepositDto,
  ): Promise<Staking> {
    return this.stakingDepositService.createDeposit(jwt.id, stakingId, dto);
  }

  // this is done by job
  @Patch(':id')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(UserRole.USER))
  async confirmDeposit(
    @GetJwt() jwt: JwtPayload,
    @Param('stakingId') stakingId: string,
    @Param('id') depositId: string,
    @Body() dto: ConfirmDepositDto,
  ): Promise<Staking> {
    return this.stakingDepositService.confirmDeposit(jwt.id, stakingId, depositId, dto);
  }
}
