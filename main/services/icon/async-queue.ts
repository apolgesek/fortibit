import { IAsyncQueue } from "./async-queue.model";

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(() => resolve(), ms));

const attempts = Symbol('attempts');
const toRetry = Symbol('toRetry');

interface Queue {
  [key: string]: any;
}

type Queueable<T> = Queue & T;

export class AsyncQueue<T,K> implements IAsyncQueue<T> {
  private readonly queue: Queueable<T>[] = [];

  constructor(
    private readonly asyncFn: (item: T) => Promise<K>,
    private readonly onFulfilled: (item: T, value: K) => void,
    private readonly batchSize = 5,
    private readonly intervalSeconds = 10,
    private readonly maxRetries = 3,
  ) {}

  async process() {
    if (!this.queue.length) {
      console.log('Queue is empty. Waiting...');

      await sleep(this.intervalSeconds * 1000);
      this.process();

      return;
    }

    const batchArray = this.createBatches<Queueable<T>>(this.queue, this.batchSize);

    for (let i = 0; i < batchArray.length; i++) {
      const batch = batchArray[i];
      const promises = batch.map(this.asyncFn);

      try {
        const result = await Promise.allSettled(promises);
        result.forEach((result, j) => {
          if (result.status === 'fulfilled') {
            this.onFulfilled(batch[j], result.value);
          } else {
            if (!result.reason.code) {
              batch[j] = { ...batch[j], [attempts]: batch[j][attempts as unknown as string] + 1 };
              if (batch[j][attempts as unknown as string] < this.maxRetries) {
                this.add({ ...batch[j], [toRetry]: true });
              }
            }
          }
        });

        this.queue.splice(0, this.batchSize);
        await sleep(1000);
      } catch (err) {
        console.log('Error occured processing queue.');
      }
    }

    await sleep(this.intervalSeconds * 1000);
    this.process();
  }

  add(item: T): void {
    const queueableItem: Queueable<T> = { ...item, [attempts]: item[attempts] ?? 0, [toRetry]: item[toRetry] ?? false };
    this.queue.push(queueableItem);
  }

  private createBatches<T>(array: T[], size: number): T[][] {
    const batches: T[][] = [];

    for (let i = 0; i < array.length; i += size) {
      const batch: T[] = array.slice(i, i + size);
      batches.push(batch);
    }

    return batches;
  }
}