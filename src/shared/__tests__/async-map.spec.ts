import { AsyncMap } from '../async-map';

describe('AsyncMap', () => {
  let map: AsyncMap<{ result: number }>;

  beforeEach(async () => {
    map = new AsyncMap();
  });

  it('should be defined', () => {
    expect(map).toBeDefined();
  });

  it('should register on wait', () => {
    void map.wait('id1', 1).catch(() => undefined);
    void map.wait('id2', 1).catch(() => undefined);

    expect(map.get()).toStrictEqual(['id1', 'id2']);
  });

  it('should not do double registering', () => {
    void map.wait('id', 1).catch(() => undefined);
    void map.wait('id', 1).catch(() => undefined);

    expect(map.get()).toStrictEqual(['id']);
  });

  it('should throw on timeout', async () => {
    await expect(map.wait('id', 1)).rejects.toThrowError('id timed out');
  });

  it('should throw on reject', async () => {
    setTimeout(() => map.reject('id', 'this one failed'));
    await expect(map.wait('id', 100)).rejects.toThrowError('this one failed');
  });

  it('should return on resolve', async () => {
    setTimeout(() => map.resolve('id', { result: 42 }));
    await expect(map.wait('id', 100)).resolves.toMatchObject({ result: 42 });
  });
});
