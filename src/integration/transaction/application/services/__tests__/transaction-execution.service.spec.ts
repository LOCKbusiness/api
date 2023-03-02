import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import BigNumber from 'bignumber.js';
import { BehaviorSubject } from 'rxjs';
import { UtxoSizePriority } from 'src/blockchain/ain/jellyfish/domain/enums';
import { createCustomRawTxDto } from 'src/blockchain/ain/jellyfish/dto/__mocks__/raw-tx.dto.mock';
import { RawTxService } from 'src/blockchain/ain/jellyfish/services/raw-tx.service';
import { RawTxCheck } from 'src/blockchain/ain/jellyfish/utils/raw-tx-check';
import { RawTxMasternode } from 'src/blockchain/ain/jellyfish/utils/raw-tx-masternode';
import { RawTxUtxo } from 'src/blockchain/ain/jellyfish/utils/raw-tx-utxo';
import { DeFiClient } from 'src/blockchain/ain/node/defi-client';
import { NodeService } from 'src/blockchain/ain/node/node.service';
import { WhaleClient } from 'src/blockchain/ain/whale/whale-client';
import { WhaleService } from 'src/blockchain/ain/whale/whale.service';
import { CryptoService } from 'src/blockchain/shared/services/crypto.service';
import { Config } from 'src/config/config';
import { createDefaultMasternode } from 'src/integration/masternode/domain/entities/__mocks__/masternode.entity.mock';
import { TransactionType } from 'src/integration/transaction/domain/enums';
import { VaultService } from 'src/integration/vault/application/services/vault.service';
import { AssetType } from 'src/shared/models/asset/asset.entity';
import { TestUtil } from 'src/shared/__tests__/test-util';
import { SendCoinWithdrawalData } from '../../types/creation-data';
import { TransactionCacheService } from '../transaction-cache.service';
import { TransactionExecutionService } from '../transaction-execution.service';
import { TransactionService } from '../transaction.service';

const rawTxCreateMasternode = createCustomRawTxDto({ hex: 'create-masternode' });
const rawTxResignMasternode = createCustomRawTxDto({ hex: 'resign-masternode' });
const rawTxWithdrawal = createCustomRawTxDto({ hex: 'withdrawal' });
const rawTxSendFromLiq = createCustomRawTxDto({ hex: 'send-from-liq' });
const rawTxSendToLiq = createCustomRawTxDto({ hex: 'send-to-liq' });

describe('TransactionExecutionService', () => {
  let service: TransactionExecutionService;

  let transactionService: TransactionService;
  let transactionCache: TransactionCacheService;
  let vaultService: VaultService;
  let rawTxService: RawTxService;
  let cryptoService: CryptoService;
  let whaleService: WhaleService;
  let nodeService: NodeService;

  let whaleClient: WhaleClient;
  let nodeClient: DeFiClient;

  let rawTxMasternode: RawTxMasternode;
  let rawTxUtxo: RawTxUtxo;

  beforeEach(async () => {
    transactionService = createMock<TransactionService>();
    transactionCache = createMock<TransactionCacheService>();
    vaultService = createMock<VaultService>();
    rawTxService = createMock<RawTxService>();
    cryptoService = createMock<CryptoService>();
    whaleService = createMock<WhaleService>();
    nodeService = createMock<NodeService>();

    whaleClient = createMock<WhaleClient>();
    nodeClient = createMock<DeFiClient>();

    rawTxMasternode = createMock<RawTxMasternode>();
    rawTxUtxo = createMock<RawTxUtxo>();

    jest.spyOn(whaleClient, 'sendRaw').mockResolvedValue('tx-id');
    jest.spyOn(nodeClient, 'dumpPrivKey').mockResolvedValue('L52sDjGxf8Y5NHy5BjTpQHQUjHDjrqErHyTomskefFXrKPdjf7Di');
    jest.spyOn(transactionService, 'sign').mockResolvedValue('signed-raw-tx-hex');
    jest.spyOn(whaleService, 'getClient').mockImplementation(() => new BehaviorSubject(whaleClient).asObservable());
    jest
      .spyOn(nodeService, 'getConnectedNode')
      .mockImplementation(() => new BehaviorSubject(nodeClient).asObservable());

    TestUtil.setProperty(rawTxService, 'Masternode', rawTxMasternode);
    TestUtil.setProperty(rawTxService, 'Utxo', rawTxUtxo);

    const mockIsAllowed = jest.fn().mockReturnValue(true);
    RawTxCheck.isAllowed = mockIsAllowed;

    const module: TestingModule = await Test.createTestingModule({
      imports: [],
      providers: [
        TransactionExecutionService,
        { provide: TransactionService, useValue: transactionService },
        { provide: TransactionCacheService, useValue: transactionCache },
        { provide: VaultService, useValue: vaultService },
        { provide: RawTxService, useValue: rawTxService },
        { provide: CryptoService, useValue: cryptoService },
        { provide: WhaleService, useValue: whaleService },
        { provide: NodeService, useValue: nodeService },
        TestUtil.provideConfig({
          staking: {
            signature: { address: 'some-test-address' },
            liquidity: { address: 'some-test-liquidity-address' },
          },
        }),
      ],
    }).compile();

    service = module.get<TransactionExecutionService>(TransactionExecutionService);
  });

  const Setup = {
    CreateMasternode: () => {
      jest.spyOn(rawTxMasternode, 'create').mockResolvedValue(rawTxCreateMasternode);
    },
    CreateMasternodeFail: () => {
      Setup.CreateMasternode();
      jest.spyOn(transactionService, 'sign').mockRejectedValue('Error');
    },
    ResignMasternode: () => {
      jest.spyOn(rawTxMasternode, 'resign').mockResolvedValue(rawTxResignMasternode);
    },
    Withdrawal: () => {
      jest.spyOn(transactionCache, 'get').mockResolvedValue(undefined);
      jest.spyOn(rawTxUtxo, 'sendWithChange').mockResolvedValue(rawTxWithdrawal);
    },
    WithdrawalFail: () => {
      Setup.Withdrawal();
      jest.spyOn(transactionService, 'sign').mockRejectedValue('Error');
    },
    WithdrawalCache: () => {
      jest.spyOn(transactionCache, 'get').mockResolvedValue(rawTxWithdrawal);
    },
    SendFromLiq: () => {
      jest.spyOn(rawTxUtxo, 'sendWithChange').mockResolvedValue(rawTxSendFromLiq);
    },
    SendToLiq: () => {
      jest.spyOn(rawTxUtxo, 'forward').mockResolvedValue(rawTxSendToLiq);
    },
  };

  // --- SUCCESS CASES --- //
  it('should create raw tx, request sign message, sign and broadcast for create masternode', async () => {
    Setup.CreateMasternode();

    const masternode = createDefaultMasternode();
    const txId = await service.createMasternode({
      masternode,
      ownerWallet: masternode.ownerWallet,
      accountIndex: masternode.accountIndex,
    });

    expect(txId).toStrictEqual('tx-id');
    expect(rawTxMasternode.create).toBeCalledWith(masternode);
    expect(nodeClient.dumpPrivKey).toBeCalledWith('some-test-address');
    expect(transactionService.sign).toBeCalledWith(rawTxCreateMasternode, 'signed-tx-hex-as-message', {
      ownerWallet: 'cold-wallet-a',
      accountIndex: 1,
      type: TransactionType.CREATE_MASTERNODE,
      isIncoming: false,
    });
    expect(whaleClient.sendRaw).toBeCalledWith('signed-raw-tx-hex');
  });

  it('should create raw tx, request sign message, sign and broadcast for resign masternode', async () => {
    Setup.ResignMasternode();

    const masternode = createDefaultMasternode();
    const txId = await service.resignMasternode({
      masternode,
      ownerWallet: masternode.ownerWallet,
      accountIndex: masternode.accountIndex,
    });

    expect(txId).toStrictEqual('tx-id');
    expect(rawTxMasternode.resign).toBeCalledWith(masternode);
    expect(nodeClient.dumpPrivKey).toBeCalledWith('some-test-address');
    expect(transactionService.sign).toBeCalledWith(rawTxResignMasternode, 'signed-tx-hex-as-message', {
      ownerWallet: 'cold-wallet-a',
      accountIndex: 1,
      type: TransactionType.RESIGN_MASTERNODE,
      isIncoming: false,
    });
    expect(whaleClient.sendRaw).toBeCalledWith('signed-raw-tx-hex');
  });

  it('should create raw tx, request sign message, sign and broadcast for withdrawal', async () => {
    Setup.Withdrawal();

    const withdrawal: SendCoinWithdrawalData = {
      withdrawalId: 37,
      amount: new BigNumber(5.3456),
      type: AssetType.COIN,
      to: 'user-address',
    };
    const txId = await service.sendWithdrawal(withdrawal);

    expect(txId).toStrictEqual('tx-id');
    expect(rawTxUtxo.sendWithChange).toBeCalledWith(
      Config.staking.liquidity.address,
      withdrawal.to,
      withdrawal.amount,
      UtxoSizePriority.FITTING,
    );
    expect(transactionCache.set).toBeCalledWith(
      TransactionType.WITHDRAWAL,
      withdrawal.withdrawalId.toString(),
      rawTxWithdrawal,
    );
    expect(nodeClient.dumpPrivKey).toBeCalledWith('some-test-address');
    expect(transactionService.sign).toBeCalledWith(rawTxWithdrawal, 'signed-tx-hex-as-message', {
      id: withdrawal.withdrawalId,
      assetType: AssetType.COIN,
      type: TransactionType.WITHDRAWAL,
      isIncoming: false,
    });
    expect(whaleClient.sendRaw).toBeCalledWith('signed-raw-tx-hex');
  });

  it('should not create raw tx for withdrawal from cache', async () => {
    Setup.WithdrawalCache();

    const withdrawal: SendCoinWithdrawalData = {
      withdrawalId: 37,
      amount: new BigNumber(5.3456),
      type: AssetType.COIN,
      to: 'user-address',
    };
    const txId = await service.sendWithdrawal(withdrawal);

    expect(txId).toStrictEqual('tx-id');
    expect(rawTxUtxo.sendWithChange).toBeCalledTimes(0);
    expect(transactionCache.set).toBeCalledTimes(0);
    expect(nodeClient.dumpPrivKey).toBeCalledWith('some-test-address');
    expect(transactionService.sign).toBeCalledWith(rawTxWithdrawal, 'signed-tx-hex-as-message', {
      id: withdrawal.withdrawalId,
      assetType: AssetType.COIN,
      type: TransactionType.WITHDRAWAL,
      isIncoming: false,
    });
    expect(whaleClient.sendRaw).toBeCalledWith('signed-raw-tx-hex');
  });

  it('should create raw tx, request sign message, sign and broadcast for send from liquidity manager', async () => {
    Setup.SendFromLiq();

    const masternode = createDefaultMasternode();
    const txId = await service.sendFromLiq({
      to: masternode.owner,
      amount: new BigNumber(42),
      ownerWallet: masternode.ownerWallet,
      accountIndex: masternode.accountIndex,
      sizePriority: UtxoSizePriority.BIG,
    });

    expect(txId).toStrictEqual('tx-id');
    expect(rawTxUtxo.sendWithChange).toBeCalledWith(
      'some-test-liquidity-address',
      'owner-address',
      new BigNumber(42),
      UtxoSizePriority.BIG,
    );
    expect(nodeClient.dumpPrivKey).toBeCalledWith('some-test-address');
    expect(transactionService.sign).toBeCalledWith(rawTxSendFromLiq, 'signed-tx-hex-as-message', {
      ownerWallet: 'cold-wallet-a',
      accountIndex: 1,
      type: TransactionType.SEND_FROM_LIQ,
      isIncoming: false,
    });
    expect(whaleClient.sendRaw).toBeCalledWith('signed-raw-tx-hex');
  });

  it('should create raw tx, request sign message, sign and broadcast for send to liquidity manager', async () => {
    Setup.SendToLiq();

    const masternode = createDefaultMasternode();
    const txId = await service.sendToLiq({
      from: masternode.owner,
      amount: new BigNumber(42),
      ownerWallet: masternode.ownerWallet,
      accountIndex: masternode.accountIndex,
    });

    expect(txId).toStrictEqual('tx-id');
    expect(rawTxUtxo.forward).toBeCalledWith('owner-address', 'some-test-liquidity-address', new BigNumber(42));
    expect(nodeClient.dumpPrivKey).toBeCalledWith('some-test-address');
    expect(transactionService.sign).toBeCalledWith(rawTxSendToLiq, 'signed-tx-hex-as-message', {
      ownerWallet: 'cold-wallet-a',
      accountIndex: 1,
      type: TransactionType.SEND_TO_LIQ,
      isIncoming: false,
    });
    expect(whaleClient.sendRaw).toBeCalledWith('signed-raw-tx-hex');
  });

  // --- FAIL CASES --- //
  it('should unlock UTXOs on create masternode fail', async () => {
    Setup.CreateMasternodeFail();

    const masternode = createDefaultMasternode();
    await expect(
      service.createMasternode({
        masternode,
        ownerWallet: masternode.ownerWallet,
        accountIndex: masternode.accountIndex,
      }),
    ).rejects.toBe('Error');

    expect(rawTxMasternode.create).toBeCalledWith(masternode);
    expect(nodeClient.dumpPrivKey).toBeCalledWith('some-test-address');
    expect(transactionService.sign).toBeCalledWith(rawTxCreateMasternode, 'signed-tx-hex-as-message', {
      ownerWallet: 'cold-wallet-a',
      accountIndex: 1,
      type: TransactionType.CREATE_MASTERNODE,
      isIncoming: false,
    });
    expect(whaleClient.sendRaw).toBeCalledTimes(0);
    expect(rawTxService.unlockUtxosOf).toBeCalledWith(rawTxCreateMasternode);
  });

  it('should not unlock UTXOs on withdrawal fail', async () => {
    Setup.WithdrawalFail();

    const withdrawal: SendCoinWithdrawalData = {
      withdrawalId: 37,
      amount: new BigNumber(5.3456),
      type: AssetType.COIN,
      to: 'user-address',
    };
    await expect(service.sendWithdrawal(withdrawal)).rejects.toBe('Error');

    expect(rawTxUtxo.sendWithChange).toBeCalledWith(
      Config.staking.liquidity.address,
      withdrawal.to,
      withdrawal.amount,
      UtxoSizePriority.FITTING,
    );
    expect(transactionCache.set).toBeCalledWith(
      TransactionType.WITHDRAWAL,
      withdrawal.withdrawalId.toString(),
      rawTxWithdrawal,
    );
    expect(nodeClient.dumpPrivKey).toBeCalledWith('some-test-address');
    expect(transactionService.sign).toBeCalledWith(rawTxWithdrawal, 'signed-tx-hex-as-message', {
      id: withdrawal.withdrawalId,
      assetType: AssetType.COIN,
      type: TransactionType.WITHDRAWAL,
      isIncoming: false,
    });
    expect(whaleClient.sendRaw).toBeCalledTimes(0);
    expect(rawTxService.unlockUtxosOf).toBeCalledTimes(0);
  });
});
