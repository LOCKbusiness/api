import { Injectable } from '@nestjs/common';
import { DeFiClient } from 'src/blockchain/ain/node/defi-client';
import { NodeService, NodeType } from 'src/blockchain/ain/node/node.service';

@Injectable()
export class StakingDeFiChainService {
  private client: DeFiClient;

  constructor(nodeService: NodeService) {
    nodeService.getConnectedNode<NodeType.INPUT>(NodeType.INPUT).subscribe((client) => (this.client = client));
  }
}
