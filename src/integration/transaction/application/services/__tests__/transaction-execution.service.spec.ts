import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import BigNumber from 'bignumber.js';
import { BehaviorSubject } from 'rxjs';
import { createCustomRawTxDto } from 'src/blockchain/ain/jellyfish/dto/__mocks__/raw-tx.dto.mock';
import { JellyfishService } from 'src/blockchain/ain/jellyfish/jellyfish.service';
import { UtxoSizePriority } from 'src/blockchain/ain/jellyfish/utxo-provider.service';
import { DeFiClient } from 'src/blockchain/ain/node/defi-client';
import { NodeService } from 'src/blockchain/ain/node/node.service';
import { WhaleClient } from 'src/blockchain/ain/whale/whale-client';
import { WhaleService } from 'src/blockchain/ain/whale/whale.service';
import { CryptoService } from 'src/blockchain/shared/services/crypto.service';
import { createDefaultMasternode } from 'src/integration/masternode/domain/entities/__mocks__/masternode.entity.mock';
import { TransactionType } from 'src/integration/transaction/domain/enums';
import { TestUtil } from 'src/shared/__tests__/test-util';
import { TransactionExecutionService } from '../transaction-execution.service';
import { TransactionService } from '../transaction.service';

enum TestSetup {
  CREATE_MASTERNODE,
  RESIGN_MASTERNODE,
  SEND_FROM_LIQ,
  SEND_TO_LIQ,
}

const rawTxCreateMasternode = createCustomRawTxDto({ hex: 'create-masternode' });
const rawTxResignMasternode = createCustomRawTxDto({ hex: 'resign-masternode' });
const rawTxSendFromLiq = createCustomRawTxDto({ hex: 'send-from-liq' });
const rawTxSendToLiq = createCustomRawTxDto({ hex: 'send-to-liq' });

describe('TransactionExecutionService', () => {
  let service: TransactionExecutionService;

  let transactionService: TransactionService;
  let jellyfishService: JellyfishService;
  let cryptoService: CryptoService;
  let whaleService: WhaleService;
  let nodeService: NodeService;

  let whaleClient: WhaleClient;
  let nodeClient: DeFiClient;

  beforeEach(async () => {
    transactionService = createMock<TransactionService>();
    jellyfishService = createMock<JellyfishService>();
    cryptoService = createMock<CryptoService>();
    whaleService = createMock<WhaleService>();
    nodeService = createMock<NodeService>();

    whaleClient = createMock<WhaleClient>();
    nodeClient = createMock<DeFiClient>();

    jest.spyOn(whaleClient, 'sendRaw').mockResolvedValue('tx-id');
    jest.spyOn(nodeClient, 'dumpPrivKey').mockResolvedValue('L52sDjGxf8Y5NHy5BjTpQHQUjHDjrqErHyTomskefFXrKPdjf7Di');
    jest.spyOn(transactionService, 'sign').mockResolvedValue('signed-raw-tx-hex');
    jest.spyOn(whaleService, 'getClient').mockImplementation(() => new BehaviorSubject(whaleClient).asObservable());
    jest
      .spyOn(nodeService, 'getConnectedNode')
      .mockImplementation(() => new BehaviorSubject(nodeClient).asObservable());

    const module: TestingModule = await Test.createTestingModule({
      imports: [],
      providers: [
        TransactionExecutionService,
        { provide: TransactionService, useValue: transactionService },
        { provide: JellyfishService, useValue: jellyfishService },
        { provide: CryptoService, useValue: cryptoService },
        { provide: WhaleService, useValue: whaleService },
        { provide: NodeService, useValue: nodeService },
        TestUtil.provideConfig({ staking: { signature: { address: 'some-test-address' } } }),
      ],
    }).compile();

    service = module.get<TransactionExecutionService>(TransactionExecutionService);
  });

  function setup(testSetup: TestSetup) {
    switch (testSetup) {
      case TestSetup.CREATE_MASTERNODE:
        jest.spyOn(jellyfishService, 'rawTxForCreate').mockResolvedValue(rawTxCreateMasternode);
        break;
      case TestSetup.RESIGN_MASTERNODE:
        jest.spyOn(jellyfishService, 'rawTxForResign').mockResolvedValue(rawTxResignMasternode);
        break;
      case TestSetup.SEND_FROM_LIQ:
        jest.spyOn(jellyfishService, 'rawTxForSendFromLiq').mockResolvedValue(rawTxSendFromLiq);
        break;
      case TestSetup.SEND_TO_LIQ:
        jest.spyOn(jellyfishService, 'rawTxForSendToLiq').mockResolvedValue(rawTxSendToLiq);
        break;
    }
  }

  it('should create raw tx, request sign message, sign and broadcast for create masternode', async () => {
    setup(TestSetup.CREATE_MASTERNODE);
    const masternode = createDefaultMasternode();
    const txId = await service.createMasternode({
      masternode,
      ownerWallet: masternode.ownerWallet,
      accountIndex: masternode.accountIndex,
    });

    expect(txId).toStrictEqual('tx-id');
    expect(jellyfishService.rawTxForCreate).toBeCalledWith(masternode);
    expect(nodeClient.dumpPrivKey).toBeCalledWith('some-test-address');
    expect(transactionService.sign).toBeCalledWith(rawTxCreateMasternode, 'signed-tx-hex-as-message', {
      ownerWallet: 'cold-wallet-a',
      accountIndex: 1,
      type: TransactionType.CREATE_MASTERNODE,
    });
    expect(whaleClient.sendRaw).toBeCalledWith('signed-raw-tx-hex');
  });

  it('should create raw tx, request sign message, sign and broadcast for resign masternode', async () => {
    setup(TestSetup.RESIGN_MASTERNODE);
    const masternode = createDefaultMasternode();
    const txId = await service.resignMasternode({
      masternode,
      ownerWallet: masternode.ownerWallet,
      accountIndex: masternode.accountIndex,
    });

    expect(txId).toStrictEqual('tx-id');
    expect(jellyfishService.rawTxForResign).toBeCalledWith(masternode);
    expect(nodeClient.dumpPrivKey).toBeCalledWith('some-test-address');
    expect(transactionService.sign).toBeCalledWith(rawTxResignMasternode, 'signed-tx-hex-as-message', {
      ownerWallet: 'cold-wallet-a',
      accountIndex: 1,
      type: TransactionType.RESIGN_MASTERNODE,
    });
    expect(whaleClient.sendRaw).toBeCalledWith('signed-raw-tx-hex');
  });

  it('should create raw tx, request sign message, sign and broadcast for send from liquidity manager', async () => {
    setup(TestSetup.SEND_FROM_LIQ);
    const masternode = createDefaultMasternode();
    const txId = await service.sendFromLiq({
      to: masternode.owner,
      amount: new BigNumber(42),
      ownerWallet: masternode.ownerWallet,
      accountIndex: masternode.accountIndex,
      sizePriority: UtxoSizePriority.BIG,
    });

    expect(txId).toStrictEqual('tx-id');
    expect(jellyfishService.rawTxForSendFromLiq).toBeCalledWith(
      'owner-address',
      new BigNumber(42),
      UtxoSizePriority.BIG,
    );
    expect(nodeClient.dumpPrivKey).toBeCalledWith('some-test-address');
    expect(transactionService.sign).toBeCalledWith(rawTxSendFromLiq, 'signed-tx-hex-as-message', {
      ownerWallet: 'cold-wallet-a',
      accountIndex: 1,
      type: TransactionType.SEND_FROM_LIQ,
    });
    expect(whaleClient.sendRaw).toBeCalledWith('signed-raw-tx-hex');
  });

  it('should create raw tx, request sign message, sign and broadcast for send to liquidity manager', async () => {
    setup(TestSetup.SEND_TO_LIQ);
    const masternode = createDefaultMasternode();
    const txId = await service.sendToLiq({
      from: masternode.owner,
      amount: new BigNumber(42),
      ownerWallet: masternode.ownerWallet,
      accountIndex: masternode.accountIndex,
    });

    expect(txId).toStrictEqual('tx-id');
    expect(jellyfishService.rawTxForSendToLiq).toBeCalledWith('owner-address', new BigNumber(42));
    expect(nodeClient.dumpPrivKey).toBeCalledWith('some-test-address');
    expect(transactionService.sign).toBeCalledWith(rawTxSendToLiq, 'signed-tx-hex-as-message', {
      ownerWallet: 'cold-wallet-a',
      accountIndex: 1,
      type: TransactionType.SEND_TO_LIQ,
    });
    expect(whaleClient.sendRaw).toBeCalledWith('signed-raw-tx-hex');
  });
});
