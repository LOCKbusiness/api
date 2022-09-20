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
import { Blockchain } from '../enums/blockchain.enum';
import { Wallet } from 'src/subdomains/user/domain/entities/wallet.entity';
import { CryptoService } from 'src/blockchain/crypto.service';
import { CreateWalletDto } from 'src/subdomains/user/application/dto/create-wallet.dto';
import { AuthCredentialsDto } from '../auth/auth-credentials.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly walletService: WalletService,
    private readonly jwtService: JwtService,
    private readonly cryptoService: CryptoService,
  ) {}

  async signUp(dto: CreateWalletDto, userIp: string): Promise<{ accessToken: string }> {
    const existingWallet = await this.walletService.getByAddress(dto.address);
    if (existingWallet) {
      throw new ConflictException('User already exists');
    }

    if (!this.verifySignature(dto.address, dto.signature)) {
      throw new BadRequestException('Invalid signature');
    }

    const wallet = await this.walletService.createWallet(dto, userIp);
    return { accessToken: this.generateToken(wallet) };
  }

  async signIn({ address, signature }: AuthCredentialsDto): Promise<{ accessToken: string }> {
    const wallet = await this.walletService.getByAddress(address);
    if (!wallet) throw new NotFoundException('User not found');

    const credentialsValid = this.verifySignature(address, signature);
    if (!credentialsValid) throw new UnauthorizedException('Invalid credentials');

    return { accessToken: this.generateToken(wallet) };
  }

  getSignMessage(address: string): { message: string; blockchains: Blockchain[] } {
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
      id: wallet.id,
      address: wallet.address,
      role: wallet.role,
      blockchains: this.cryptoService.getBlockchainsBasedOn(wallet.address),
    };
    return this.jwtService.sign(payload);
  }
}
