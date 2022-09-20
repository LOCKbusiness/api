import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { RealIP } from 'nestjs-real-ip';
import { CreateWalletDto } from 'src/subdomains/user/application/dto/create-wallet.dto';
import { Blockchain } from '../enums/blockchain.enum';
import { AuthService } from '../services/auth.service';
import { AuthCredentialsDto } from './auth-credentials.dto';
import { AuthMessageDto } from './auth-message.dto';
import { AuthResponseDto } from './auth-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signUp')
  @ApiResponse({ status: 200, type: AuthResponseDto })
  signUp(@Body() dto: CreateWalletDto, @RealIP() ip: string): Promise<{ accessToken: string }> {
    return this.authService.signUp(dto, ip);
  }

  @Post('signIn')
  @ApiResponse({ status: 200, type: AuthResponseDto })
  signIn(@Body() credentials: AuthCredentialsDto): Promise<{ accessToken: string }> {
    return this.authService.signIn(credentials);
  }

  @Get('signMessage')
  @ApiResponse({ status: 200, type: AuthMessageDto })
  getSignMessage(@Query('address') address: string): { message: string; blockchains: Blockchain[] } {
    return this.authService.getSignMessage(address);
  }
}
