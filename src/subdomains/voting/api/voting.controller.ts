import { Body, Controller, Get, ParseArrayPipe, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { GetJwt } from 'src/shared/auth/get-jwt.decorator';
import { JwtPayload } from 'src/shared/auth/jwt-payload.interface';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { UserService } from 'src/subdomains/user/application/services/user.service';
import { CfpResultDto } from '../application/dto/cfp-result.dto';
import { CfpVoteDto } from '../application/dto/cfp-vote.dto';
import { Votes } from '../application/dto/votes.dto';
import { Vote } from '../domain/enums';
import { VotingService } from '../application/services/voting.service';

@ApiTags('Voting')
@Controller('voting')
export class VotingController {
  constructor(private readonly userService: UserService, private readonly votingService: VotingService) {}

  @Get('votes')
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.USER))
  @ApiOkResponse({ schema: { type: 'object', example: { '220': Vote.YES, '221': Vote.NO, '243': Vote.NEUTRAL } } })
  async getVotes(@GetJwt() jwt: JwtPayload): Promise<Votes> {
    return this.userService.getVotes(jwt.userId);
  }

  @Put('votes')
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.USER))
  @ApiOkResponse({ schema: { type: 'object', example: { '220': Vote.YES, '221': Vote.NO, '243': Vote.NEUTRAL } } })
  async updateVotes(@GetJwt() jwt: JwtPayload, @Body() votes: Votes): Promise<Votes> {
    return this.userService.updateVotes(jwt.userId, votes);
  }

  @Get('result')
  @ApiOkResponse({ type: CfpResultDto, isArray: true })
  async getCurrentResult(): Promise<CfpResultDto[]> {
    return this.votingService.result;
  }

  // --- ADMIN --- //
  @Get('mn-votes')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.ADMIN))
  async getMasternodeVotes(): Promise<CfpVoteDto[]> {
    return this.votingService.getMasternodeVotes();
  }

  @Post('mn-votes')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.ADMIN))
  async createMasternodeVotes(@Body(new ParseArrayPipe({ items: CfpVoteDto })) votes: CfpVoteDto[]): Promise<void> {
    return this.votingService.createVotes(votes);
  }
}
