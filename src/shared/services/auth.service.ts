import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtPayload } from 'src/shared/auth/jwt-payload.interface';
import { JwtService } from '@nestjs/jwt';
import { Config } from 'src/config/config';
import { WalletService } from 'src/subdomains/user/application/services/wallet.service';
import { Wallet } from 'src/subdomains/user/domain/entities/wallet.entity';
import { CryptoService } from 'src/blockchain/shared/services/crypto.service';
import { SignUpDto } from '../auth/dto/sign-up.dto';
import { SignInDto } from '../auth/dto/sign-in.dto';
import { AuthResponseDto } from '../auth/dto/auth-response.dto';
import { SignMessageDto } from '../auth/dto/sign-message.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly walletService: WalletService,
    private readonly jwtService: JwtService,
    private readonly cryptoService: CryptoService,
  ) {}

  async signUp(dto: SignUpDto, userIp: string): Promise<AuthResponseDto> {
    const existingWallet = await this.walletService.getByAddress(dto.address, true);
    if (existingWallet) {
      throw new ConflictException('User already exists');
    }

    if (!this.verifySignature(dto.address, dto.signature)) {
      throw new BadRequestException('Invalid signature');
    }

    const wallet = await this.walletService.createWallet(dto, userIp);
    return { accessToken: this.generateToken(wallet) };
  }

  async signIn({ address, signature }: SignInDto): Promise<AuthResponseDto> {
    const wallet = await this.walletService.getByAddress(address, true);
    if (!wallet) throw new NotFoundException('User not found');

    const credentialsValid = this.verifySignature(address, signature);
    if (!credentialsValid) throw new UnauthorizedException('Invalid credentials');

    return { accessToken: this.generateToken(wallet) };
  }

  getSignMessage(address: string): SignMessageDto {
    const blockchains = this.cryptoService.getBlockchainsBasedOn(address);
    return {
      message: Config.auth.signMessage + address,
      blockchains,
    };
  }

  private verifySignature(address: string, signature: string): boolean {
    const signatureMessage = this.getSignMessage(address);
    return this.cryptoService.verifySignature(signatureMessage.message, address, signature);
  }

  private generateToken(wallet: Wallet): string {
    const payload: JwtPayload = {
      walletId: wallet.id,
      userId: wallet.user?.id,
      address: wallet.address,
      role: wallet.role,
      blockchains: this.cryptoService.getBlockchainsBasedOn(wallet.address),
    };
    return this.jwtService.sign(payload);
  }
}
