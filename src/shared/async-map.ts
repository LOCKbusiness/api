export interface Subscriber<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

export class AsyncMap<T> {
  private readonly subscribers = new Map<string, Subscriber<T>>();

  public wait(id: string, timeout: number): Promise<T> {
    const existing = this.subscribers.get(id);
    if (existing) return existing.promise;

    const subscriber = {} as Subscriber<T>;
    const promise = new Promise<T>((resolve, reject) => {
      subscriber.resolve = resolve;
      subscriber.reject = reject;
      subscriber.timer = setTimeout(() => this.reject(id, `${id} timed out`), timeout);
    });
    subscriber.promise = promise;

    this.subscribers.set(id, subscriber);

    return promise;
  }

  public get(): string[] {
    return Array.from(this.subscribers.keys());
  }

  public resolve(id: string, value: T) {
    const subscriber = this.subscribers.get(id);
    if (subscriber) {
      subscriber.resolve(value);
      clearTimeout(subscriber.timer);
      this.subscribers.delete(id);
    }
  }

  public reject(id: string, reason: string) {
    const subscriber = this.subscribers.get(id);
    if (subscriber) {
      subscriber.reject(new Error(reason));
      clearTimeout(subscriber.timer);
      this.subscribers.delete(id);
    }
  }
}
