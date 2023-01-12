import { WhaleClient } from '../whale-client';
import { ApiPagedResponse, Method, WhaleApiClient } from '@defichain/whale-api-client';
import { createMock } from '@golevelup/ts-jest';
import { TokenData, Tokens } from '@defichain/whale-api-client/dist/api/tokens';
import { TestUtil } from 'src/shared/__tests__/test-util';
import { Transaction, Transactions } from '@defichain/whale-api-client/dist/api/transactions';
import { Stats, StatsData } from '@defichain/whale-api-client/dist/api/stats';

describe('WhaleClient', () => {
  let client: WhaleClient;

  let apiClient: WhaleApiClient;
  let tokens = createMock<Tokens>();
  let transactions = createMock<Transactions>();
  let stats = createMock<Stats>();

  beforeEach(async () => {
    apiClient = createMock<WhaleApiClient>();
    tokens = createMock<Tokens>();
    transactions = createMock<Transactions>();
    stats = createMock<Stats>();

    TestUtil.setProperty(apiClient, 'tokens', tokens);
    TestUtil.setProperty(apiClient, 'transactions', transactions);
    TestUtil.setProperty(apiClient, 'stats', stats);

    client = new WhaleClient(apiClient);
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

  it('should poll transactions', async () => {
    jest.spyOn(stats, 'get').mockResolvedValue({ count: { blocks: 1 } } as StatsData);
    jest.spyOn(transactions, 'get').mockResolvedValue({ id: 'tx-id' } as Transaction);

    setTimeout(() => client.pollTransactions());

    const tokenResult = await client.waitForTx('tx-id');
    expect(tokenResult).toEqual('tx-id');
  });

  it('should not poll on same block height', async () => {
    jest.spyOn(stats, 'get').mockResolvedValue({ count: { blocks: 0 } } as StatsData);

    setTimeout(() => client.pollTransactions());

    await client.waitForTx('tx-id', 1).catch(() => undefined);

    expect(transactions.get).toHaveBeenCalledTimes(0);
  });

  it('should poll multiple transactions', async () => {
    jest.spyOn(stats, 'get').mockResolvedValue({ count: { blocks: 1 } } as StatsData);
    jest.spyOn(transactions, 'get').mockResolvedValue({ id: 'tx-id' } as Transaction);

    setTimeout(() => client.pollTransactions());

    const tokenResult = await Promise.all([client.waitForTx('tx-id-1'), client.waitForTx('tx-id-2')]);
    expect(tokenResult).toHaveLength(2);
  });

  it('should poll multiple same transactions', async () => {
    jest.spyOn(stats, 'get').mockResolvedValue({ count: { blocks: 1 } } as StatsData);
    jest.spyOn(transactions, 'get').mockResolvedValue({ id: 'tx-id' } as Transaction);

    setTimeout(() => client.pollTransactions());

    const tokenResult = await Promise.all([client.waitForTx('tx-id'), client.waitForTx('tx-id')]);
    expect(tokenResult).toHaveLength(2);
  });

  it('should throw on timeout', async () => {
    await expect(client.waitForTx('tx-id', 1)).rejects.toThrowError('tx-id timed out');
  });
});
