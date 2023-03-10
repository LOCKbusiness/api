import { AddressUnspent } from '@defichain/whale-api-client/dist/api/address';
import { createMock } from '@golevelup/ts-jest';
import { TestingModule, Test } from '@nestjs/testing';
import BigNumber from 'bignumber.js';
import { BehaviorSubject } from 'rxjs';
import { UtxoProviderService } from 'src/blockchain/ain/jellyfish/services/utxo-provider.service';
import { WhaleClient } from 'src/blockchain/ain/whale/whale-client';
import { WhaleService } from 'src/blockchain/ain/whale/whale.service';
import { Config } from 'src/config/config';
import { TransactionExecutionService } from 'src/integration/transaction/application/services/transaction-execution.service';
import { TestUtil } from 'src/shared/__tests__/test-util';
import { UtxoManagementService } from '../utxo-management.service';

describe('UtxoManagementService', () => {
  let service: UtxoManagementService;

  let utxoProviderService: UtxoProviderService;
  let transactionExecutionService: TransactionExecutionService;
  let whaleService: WhaleService;

  let whaleClient: WhaleClient;

  beforeEach(async () => {
    utxoProviderService = createMock<UtxoProviderService>();
    transactionExecutionService = createMock<TransactionExecutionService>();
    whaleService = createMock<WhaleService>();

    whaleClient = createMock<WhaleClient>();

    jest.spyOn(whaleService, 'getClient').mockImplementation(() => new BehaviorSubject(whaleClient).asObservable());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: UtxoProviderService, useValue: utxoProviderService },
        { provide: TransactionExecutionService, useValue: transactionExecutionService },
        { provide: WhaleService, useValue: whaleService },
        UtxoManagementService,
        TestUtil.provideConfig(),
      ],
    }).compile();

    service = module.get<UtxoManagementService>(UtxoManagementService);
  });

  const createUnspent = (amount: number) => ({ vout: { value: amount.toString() } } as AddressUnspent);

  const Setup = {
    UtxoBalance: (balance: number) => {
      jest.spyOn(whaleClient, 'getUtxoBalance').mockResolvedValue(new BigNumber(balance));
    },
    Unspent: (unspent: AddressUnspent[]) => {
      Setup.UtxoBalance(100);

      jest.spyOn(utxoProviderService, 'retrieveAllUnspent').mockResolvedValue(unspent);
    },
  };

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should abort if balance is smaller than 100', async () => {
    Setup.UtxoBalance(50);

    await service.checkUtxos();

    expect(utxoProviderService.retrieveAllUnspent).toBeCalledTimes(0);
    expect(transactionExecutionService.mergeSmallestUtxos).toBeCalledTimes(0);
    expect(transactionExecutionService.splitBiggestUtxo).toBeCalledTimes(0);
  });

  it('should do nothing if count is below 300 and biggest smaller than 20000', async () => {
    const unspent = new Array(299).fill(1).map(createUnspent);
    Setup.Unspent(unspent);

    await service.checkUtxos();

    expect(transactionExecutionService.mergeSmallestUtxos).toBeCalledTimes(0);
    expect(transactionExecutionService.splitBiggestUtxo).toBeCalledTimes(0);
  });

  it('should merge if count is above 300 and biggest smaller than 20000', async () => {
    const unspent = new Array(400).fill(1).map((_, i) => createUnspent(i));
    Setup.Unspent(unspent);

    await service.checkUtxos();

    expect(transactionExecutionService.mergeSmallestUtxos).toBeCalledTimes(1);
    expect(transactionExecutionService.splitBiggestUtxo).toBeCalledTimes(0);
  });

  it('should split by 2 if more than 300 UTXOs and biggest is 20001', async () => {
    const unspent = new Array(400).fill(1).map((_, i) => createUnspent(i === 345 ? 20001 : i));
    Setup.Unspent(unspent);

    await service.checkUtxos();

    expect(transactionExecutionService.mergeSmallestUtxos).toBeCalledTimes(0);
    expect(transactionExecutionService.splitBiggestUtxo).toBeCalledTimes(1);
    expect(transactionExecutionService.splitBiggestUtxo).toBeCalledWith({
      address: Config.staking.liquidity.address,
      split: 2,
    });
  });

  it('should split by 12 if less than 300 UTXOs and biggest is 234575.123', async () => {
    const unspent = new Array(250).fill(1).map((_, i) => createUnspent(i === 214 ? 234575.123 : i));
    Setup.Unspent(unspent);

    await service.checkUtxos();

    expect(transactionExecutionService.mergeSmallestUtxos).toBeCalledTimes(0);
    expect(transactionExecutionService.splitBiggestUtxo).toBeCalledTimes(1);
    expect(transactionExecutionService.splitBiggestUtxo).toBeCalledWith({
      address: Config.staking.liquidity.address,
      split: 12,
    });
  });
});
