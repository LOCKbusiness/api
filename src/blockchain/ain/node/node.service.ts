import { BlockchainInfo } from '@defichain/jellyfish-api-core/dist/category/blockchain';
import { BadRequestException, Injectable } from '@nestjs/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { Config } from 'src/config/config';
import { HttpService } from 'src/shared/services/http.service';
import { DeFiClient } from './defi-client';
import { NodeClient, NodeMode } from './node-client';

export enum NodeType {
  INPUT = 'inp',
  REW = 'rew',
}

export interface NodeError {
  message: string;
  nodeType: NodeType;
  mode?: NodeMode;
}

interface NodeCheckResult {
  errors: NodeError[];
  info: BlockchainInfo | undefined;
}

type TypedNodeClient = DeFiClient;

@Injectable()
export class NodeService {
  readonly #allNodes: Map<NodeType, Record<NodeMode, NodeClient | null>> = new Map();
  readonly #connectedNodes: Map<NodeType, BehaviorSubject<NodeClient | null>> = new Map();

  constructor(private readonly http: HttpService) {
    this.initAllNodes();
    this.initConnectedNodes();
  }

  // --- HEALTH CHECK API --- //

  async checkNodes(): Promise<NodeError[]> {
    return Promise.all(Object.values(NodeType).map((type) => this.checkNodePair(type))).then((errors) =>
      errors.reduce((prev, curr) => prev.concat(curr), []),
    );
  }

  // --- PUBLIC API --- //

  getConnectedNode<T extends NodeType>(type: T): Observable<TypedNodeClient> {
    const client = this.connectedNodes.get(type);

    if (client) {
      return client.asObservable() as Observable<TypedNodeClient>;
    }

    throw new BadRequestException(`No node for type '${type}'`);
  }

  getCurrentConnectedNode<T extends NodeType>(type: T): NodeClient {
    const client = this.connectedNodes.get(type);

    if (client) {
      return client.getValue() as NodeClient;
    }

    throw new BadRequestException(`No node for type '${type}'`);
  }

  getNodeFromPool<T extends NodeType>(type: T, mode: NodeMode): NodeClient {
    const client = this.allNodes.get(type)[mode];

    if (client) {
      return client as NodeClient;
    }

    throw new BadRequestException(`No node for type '${type}' and mode '${mode}'`);
  }

  swapNode(type: NodeType, mode: NodeMode): void {
    if (this.isNodeClientAvailable(type, mode)) {
      this.#connectedNodes.get(type)?.next(this.#allNodes.get(type)[mode]);
      console.log(`Swapped node ${type} to ${mode}`);
    } else {
      throw new Error(`Tried to swap to node ${type} to ${mode}, but NodeClient is not available in the pool`);
    }
  }

  // --- INIT METHODS --- //

  private initAllNodes(): void {
    this.addNodeClientPair(NodeType.INPUT, Config.blockchain.default.inp);
    this.addNodeClientPair(NodeType.REW, Config.blockchain.default.rew);
  }

  private addNodeClientPair(type: NodeType, config: { active: string; passive: string }): void {
    const clientPair = {
      [NodeMode.ACTIVE]: this.createNodeClient(config.active, NodeMode.ACTIVE),
      [NodeMode.PASSIVE]: this.createNodeClient(config.passive, NodeMode.PASSIVE),
    };
    this.allNodes.set(type, clientPair);
  }

  private createNodeClient(url: string | undefined, mode: NodeMode): NodeClient | null {
    return url ? new DeFiClient(this.http, url, mode) : null;
  }

  private initConnectedNodes(): void {
    Object.values(NodeType).forEach((type) => this.connectedNodes.set(type, this.setConnectedNode(type)));
  }

  private setConnectedNode(type: NodeType): BehaviorSubject<NodeClient | null> {
    const active = this.isNodeClientAvailable(type, NodeMode.ACTIVE);
    const passive = this.isNodeClientAvailable(type, NodeMode.PASSIVE);

    if (active) {
      if (!passive) {
        console.warn(`Warning. Node ${type} passive is not available in NodeClient pool`);
      }

      return new BehaviorSubject(this.#allNodes.get(type)[NodeMode.ACTIVE]);
    }

    if (passive && !active) {
      console.warn(`Warning. Node ${type} active is not available in NodeClient pool. Falling back to passive`);
      return new BehaviorSubject(this.#allNodes.get(type)[NodeMode.PASSIVE]);
    }

    if (!active && !passive) {
      console.warn(`Warning. Node ${type} both active and passive are not available in NodeClient pool`);
      return new BehaviorSubject(null);
    }
  }

  // --- HELPER METHODS --- //

  private async checkNodePair(node: NodeType): Promise<NodeError[]> {
    return Promise.all([this.checkNode(node, NodeMode.ACTIVE), this.checkNode(node, NodeMode.PASSIVE)]).then(
      (pairResult) => this.handleNodePairCheck(pairResult, node),
    );
  }

  private async checkNode(type: NodeType, mode: NodeMode): Promise<NodeCheckResult> {
    const client = this.#allNodes.get(type)[mode];

    if (!client) {
      return { errors: [], info: undefined };
    }

    return client
      .getInfo()
      .then((info) => this.handleNodeCheckSuccess(info, type, mode))
      .catch(() => this.handleNodeCheckError(type, mode));
  }

  private handleNodePairCheck(pairResult: [NodeCheckResult, NodeCheckResult], node: NodeType): NodeError[] {
    const [{ errors: activeErrors, info: activeInfo }, { errors: passiveErrors, info: passiveInfo }] = pairResult;
    const errors = activeErrors.concat(passiveErrors);

    if (activeInfo && passiveInfo && Math.abs(activeInfo.headers - passiveInfo.headers) > 10) {
      errors.push({
        message: `${node} nodes not in sync (active headers: ${activeInfo.headers}, passive headers: ${passiveInfo.headers})`,
        nodeType: node,
      });
    }

    return errors;
  }

  private handleNodeCheckSuccess(info: BlockchainInfo, type: NodeType, mode: NodeMode): NodeCheckResult {
    const result = { errors: [], info };

    if (info.blocks < info.headers - 10) {
      result.errors.push({
        message: `${type} ${mode} node out of sync (blocks: ${info.blocks}, headers: ${info.headers})`,
        nodeType: type,
        mode,
      });
    }

    return result;
  }

  private handleNodeCheckError(type: NodeType, mode: NodeMode): NodeCheckResult {
    return {
      errors: [{ message: `Failed to get ${type} ${mode} node infos`, nodeType: type, mode }],
      info: undefined,
    };
  }

  private isNodeClientAvailable(type: NodeType, mode: NodeMode): boolean {
    return !!this.#allNodes.get(type)[mode];
  }

  // --- GETTERS --- //

  get allNodes(): Map<NodeType, Record<NodeMode, NodeClient | null>> {
    return this.#allNodes;
  }

  get connectedNodes(): Map<NodeType, BehaviorSubject<NodeClient | null>> {
    return this.#connectedNodes;
  }
}
