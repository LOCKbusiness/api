import { Injectable } from '@nestjs/common';
import { WhaleClient } from 'src/blockchain/ain/whale/whale-client';
import { WhaleService } from 'src/blockchain/ain/whale/whale.service';
import { Asset } from 'src/shared/entities/asset.entity';
import { Price } from '../../domain/entities/price';

@Injectable()
export class PricingDeFiChainService {
  private client: WhaleClient;

  constructor(readonly whaleService: WhaleService) {
    whaleService.getClient().subscribe((client) => (this.client = client));
  }

  async getPrice(from: Asset, to: Asset): Promise<Price> {
    const { estimatedReturnLessDexFees: price } = await this.client.getPath(from.chainId, to.chainId);

    return Price.create(from.name, to.name, 1 / +price);
  }
}
