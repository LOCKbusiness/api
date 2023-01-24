import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { GetJwt } from 'src/shared/auth/get-jwt.decorator';
import { JwtPayload } from 'src/shared/auth/jwt-payload.interface';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { UserService } from 'src/subdomains/user/application/services/user.service';
import { CfpResultDto } from '../application/dto/cfp-result.dto';
import { CfpSignMessageDto } from '../application/dto/cfp-sign-message.dto';
import { CfpVoteDto } from '../application/dto/cfp-vote.dto';
import { Vote, Votes } from '../application/dto/votes.dto';
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

  @Get('result/votes')
  @ApiOkResponse({ type: CfpVoteDto, isArray: true })
  async getCurrentUserVotes(): Promise<CfpVoteDto[]> {
    return this.votingService.getVoteDetails();
  }

  @Get('sign-messages')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.TRANSACTION_SIGNER))
  async getSignInformation(): Promise<CfpSignMessageDto[]> {
    return this.votingService.getSignMessages();
  }
}
