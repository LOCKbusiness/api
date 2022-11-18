import { TokenData } from '@defichain/whale-api-client/dist/api/tokens';
import { Injectable, NotFoundException } from '@nestjs/common';
import { WhaleClient } from './whale-client';
import { WhaleService } from './whale.service';

@Injectable()
export class TokenProviderService {
  private client: WhaleClient;
  private tokens = new Map<string, TokenData>();
  constructor(whaleService: WhaleService) {
    whaleService.getClient().subscribe((client) => (this.client = client));
  }

  async get(token: string): Promise<TokenData> {
    if (this.tokens.size === 0) {
      this.tokens = await this.retrieveAll();
    }
    if (!this.tokens.has(token)) throw new NotFoundException('Token not found!');
    return this.tokens.get(token);
  }

  private async retrieveAll(): Promise<Map<string, TokenData>> {
    const allTokens = await this.client.getAllTokens();
    return new Map(allTokens.map((tokenData) => [tokenData.symbolKey, tokenData]));
  }
}
