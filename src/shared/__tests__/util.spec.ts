import { Util } from '../util';

describe('Util', () => {
  it('should do in batches', async () => {
    const list = new Array(142).fill(0);
    const results = await Util.doInBatches(list, (items) => Promise.resolve(items.length), 30);
    expect(results).toMatchObject([30, 30, 30, 30, 22]);
  });

  it('should nothing on empty array', async () => {
    const list = [];
    const results = await Util.doInBatches(list, () => Promise.resolve(true), 30);
    expect(results).toMatchObject([]);
  });
});
