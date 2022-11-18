import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { GetJwt } from 'src/shared/auth/get-jwt.decorator';
import { JwtPayload } from 'src/shared/auth/jwt-payload.interface';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { UserService } from 'src/subdomains/user/application/services/user.service';
import { CfpDto } from '../application/dto/cfp.dto';
import { Votes } from '../application/dto/votes.dto';

@ApiTags('Voting')
@Controller('voting')
export class VotingController {
  constructor(private readonly userService: UserService) {}

  @Get('votes')
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.USER))
  async getVotes(@GetJwt() jwt: JwtPayload): Promise<Votes> {
    return this.userService.getVotes(jwt.userId);
  }

  @Put('votes')
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.USER))
  async updateVotes(@GetJwt() jwt: JwtPayload, @Body() votes: Votes): Promise<Votes> {
    return this.userService.updateVotes(jwt.userId, votes);
  }

  @Get('cfp-messages')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.TRANSACTION_SIGNER))
  async getSignInformation(): Promise<CfpDto[]> {
    return;
  }
}
