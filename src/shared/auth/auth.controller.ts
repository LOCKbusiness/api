import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { RealIP } from 'nestjs-real-ip';
import { SignUpDto } from 'src/shared/auth/dto/sign-up.dto';
import { AuthService } from '../services/auth.service';
import { SignInDto } from './dto/sign-in.dto';
import { SignMessageDto } from './dto/sign-message.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signUp')
  @ApiResponse({ status: 201, type: AuthResponseDto })
  signUp(@Body() dto: SignUpDto, @RealIP() ip: string): Promise<AuthResponseDto> {
    return this.authService.signUp(dto, ip);
  }

  @Post('signIn')
  @ApiResponse({ status: 201, type: AuthResponseDto })
  signIn(@Body() signInDto: SignInDto): Promise<AuthResponseDto> {
    return this.authService.signIn(signInDto);
  }

  @Get('signMessage')
  @ApiResponse({ status: 200, type: SignMessageDto })
  getSignMessage(@Query('address') address: string): SignMessageDto {
    return this.authService.getSignMessage(address);
  }
}
