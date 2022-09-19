import { Controller, UseGuards, Body, Post, Get, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { UserRole } from 'src/shared/auth/user-role.enum';
import { StakingService } from '../../application/services/staking.service';
import { StakingCreationDto } from '../../application/dto/staking-creation.dto';
import { Staking } from '../../domain/entities/staking.entity';
import { GetJwt } from 'src/shared/auth/get-jwt.decorator';
import { JwtPayload } from 'src/shared/auth/jwt-payload.interface';

@ApiTags('staking')
@Controller('staking')
export class StakingController {
  constructor(private readonly stakingService: StakingService) {}

  @Post()
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(UserRole.ADMIN))
  async createStaking(@GetJwt() jwt: JwtPayload, @Body() dto: StakingCreationDto): Promise<Staking> {
    return this.stakingService.createStaking(jwt.id, dto);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(UserRole.ADMIN))
  async updateVolumes(@GetJwt() jwt: JwtPayload, @Param('id') id: string): Promise<number> {
    return this.stakingService.getBalance(jwt.id, id);
  }
}
