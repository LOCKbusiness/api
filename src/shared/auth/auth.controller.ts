import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RealIP } from 'nestjs-real-ip';
import { CreateWalletDto } from 'src/subdomains/user/application/dto/create-wallet.dto';
import { Blockchain } from '../enums/blockchain.enum';
import { AuthService } from '../services/auth.service';
import { AuthCredentialsDto } from './auth-credentials.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signUp')
  signUp(@Body() dto: CreateWalletDto, @RealIP() ip: string): Promise<{ accessToken: string }> {
    return this.authService.signUp(dto, ip);
  }

  @Post('signIn')
  signIn(@Body() credentials: AuthCredentialsDto): Promise<{ accessToken: string }> {
    return this.authService.signIn(credentials);
  }

  @Get('signMessage')
  getSignMessage(@Query('address') address: string): { message: string; blockchains: Blockchain[] } {
    return this.authService.getSignMessage(address);
  }
}
