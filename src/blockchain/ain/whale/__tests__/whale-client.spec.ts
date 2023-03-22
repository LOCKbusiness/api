import { WhaleClient } from '../whale-client';
import { ApiPagedResponse, Method, WhaleApiClient } from '@defichain/whale-api-client';
import { createMock } from '@golevelup/ts-jest';
import { TokenData, Tokens } from '@defichain/whale-api-client/dist/api/tokens';
import { TestUtil } from 'src/shared/__tests__/test-util';
import { Transaction, Transactions } from '@defichain/whale-api-client/dist/api/transactions';
import { SchedulerRegistry } from '@nestjs/schedule';

describe('WhaleClient', () => {
  let client: WhaleClient;

  let scheduler: SchedulerRegistry;
  let apiClient: WhaleApiClient;
  let tokens = createMock<Tokens>();
  let transactions = createMock<Transactions>();

  beforeEach(async () => {
    scheduler = createMock<SchedulerRegistry>();
    apiClient = createMock<WhaleApiClient>();
    tokens = createMock<Tokens>();
    transactions = createMock<Transactions>();

    jest.spyOn(scheduler, 'addInterval').mockImplementation((_, interval: NodeJS.Timer) => clearInterval(interval));

    TestUtil.setProperty(apiClient, 'tokens', tokens);
    TestUtil.setProperty(apiClient, 'transactions', transactions);

    client = new WhaleClient(scheduler, 'url', 0);
  });

  function setupPagedResponse<T>(
    data: Partial<T>[][],
    method: Method = 'GET',
  ): (size?: number, next?: string) => Promise<ApiPagedResponse<T>> {
    const pagedCallMock = (_, next) => {
      const index = next ? +next : 0;
      const page = data[index + 1] ? { next: `${index + 1}` } : undefined;

      return Promise.resolve(new ApiPagedResponse({ data: data[index] as T[], page }, method, ''));
    };

    // setup paginate
    jest
      .spyOn(apiClient, 'paginate')
      .mockImplementation((response: ApiPagedResponse<T>) => pagedCallMock(undefined, response.nextToken));

    return pagedCallMock;
  }

  it('should be defined', () => {
    expect(client).toBeDefined();
  });

  it('should return paginated tokens', async () => {
    jest
      .spyOn(tokens, 'list')
      .mockImplementation(setupPagedResponse<TokenData>([[{ id: '1' }, { id: '2' }], [{ id: '3' }]]));

    const tokenResult = await client.getAllTokens();
    expect(tokenResult).toStrictEqual([{ id: '1' }, { id: '2' }, { id: '3' }]);
  });

  it('should check transactions', async () => {
    jest.spyOn(transactions, 'get').mockResolvedValue({ id: 'tx-id' } as Transaction);

    setTimeout(() => client['checkTransactions']());

    const tokenResult = await client.waitForTx('tx-id');
    expect(tokenResult).toEqual('tx-id');
  });

  it('should not check, if no transactions', async () => {
    await client['checkTransactions']();

    expect(transactions.get).toBeCalledTimes(0);
  });

  it('should check multiple transactions', async () => {
    jest.spyOn(transactions, 'get').mockResolvedValue({ id: 'tx-id' } as Transaction);

    setTimeout(() => client['checkTransactions']());

    const tokenResult = await Promise.all([client.waitForTx('tx-id-1'), client.waitForTx('tx-id-2')]);
    expect(tokenResult).toHaveLength(2);
  });

  it('should check multiple same transactions', async () => {
    jest.spyOn(transactions, 'get').mockResolvedValue({ id: 'tx-id' } as Transaction);

    setTimeout(() => client['checkTransactions']());

    const tokenResult = await Promise.all([client.waitForTx('tx-id'), client.waitForTx('tx-id')]);
    expect(tokenResult).toHaveLength(2);
  });

  it('should throw on timeout', async () => {
    await expect(client.waitForTx('tx-id', 1)).rejects.toThrowError('tx-id timed out');
  });
});
