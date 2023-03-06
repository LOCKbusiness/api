import { SchedulerRegistry } from '@nestjs/schedule';
import { Lock } from './lock';
import { Util } from './util';

class QueueItem<T> {
  private readonly timeout: NodeJS.Timeout;
  private readonly promise: Promise<T>;

  private resolve: (value: T | PromiseLike<T>) => void;
  private reject: (e: Error) => void;

  constructor(private readonly action: () => Promise<T>, timeout?: number) {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = (v) => {
        if (this.timeout) clearTimeout(this.timeout);
        resolve(v);
      };
      this.reject = (e) => {
        if (this.timeout) clearTimeout(this.timeout);
        reject(e);
      };
    });
    if (timeout) this.timeout = setTimeout(() => this.reject(new Error('Queue timed out')), timeout);
  }

  public wait(): Promise<T> {
    return this.promise;
  }

  public async doWork() {
    await this.action().then(this.resolve).catch(this.reject);
  }

  public abort() {
    this.reject?.(new Error('Queue aborted'));
  }
}

export class QueueHandler {
  private readonly lock = new Lock(1200);
  private readonly queue: QueueItem<any>[] = [];

  constructor(scheduler: SchedulerRegistry, private readonly timeout?: number) {
    const interval = setInterval(() => this.doWork(), 50);
    scheduler.addInterval(Util.randomId().toString(), interval);
  }

  async handle<T>(action: () => Promise<T>): Promise<T> {
    const item = new QueueItem(action, this.timeout);
    this.queue.push(item);
    return item.wait();
  }

  clear() {
    for (const item of this.queue) {
      item.abort();
    }
  }

  private async doWork() {
    if (!this.lock.acquire()) return;

    try {
      while (this.queue.length > 0) {
        await this.queue.shift().doWork();
      }
    } finally {
      this.lock.release();
    }
  }
}
