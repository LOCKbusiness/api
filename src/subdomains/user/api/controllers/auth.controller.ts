import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RealIP } from 'nestjs-real-ip';
import { AuthService } from '../../application/services/auth.service';
import { SignInDto } from '../../application/dto/sign-in.dto';
import { AuthResponseDto } from '../../application/dto/auth-response.dto';
import { SignUpDto } from '../../application/dto/sign-up.dto';
import { SignMessageDto } from '../../application/dto/sign-message.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('sign-up')
  @ApiCreatedResponse({ type: AuthResponseDto })
  signUp(@Body() dto: SignUpDto, @RealIP() ip: string): Promise<AuthResponseDto> {
    return this.authService.signUp(dto, ip);
  }

  @Post('sign-in')
  @ApiCreatedResponse({ type: AuthResponseDto })
  signIn(@Body() signInDto: SignInDto): Promise<AuthResponseDto> {
    return this.authService.signIn(signInDto);
  }

  @Get('sign-message')
  @ApiOkResponse({ type: SignMessageDto })
  getSignMessage(@Query('address') address: string): SignMessageDto {
    return this.authService.getSignMessage(address);
  }
}
