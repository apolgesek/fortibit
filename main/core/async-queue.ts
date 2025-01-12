import { IAsyncQueue, Result } from './async-queue.interface';

const attempts = Symbol('attempts');
const toRetry = Symbol('toRetry');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Queue = Record<string, any>;

type Queueable<T> = Queue & T;

export class AsyncQueue<T, K> implements IAsyncQueue<T> {
	private readonly queue: Queueable<T>[] = [];

	public get queueSize(): number {
		return this.queue.length;
	}

	constructor(
		private readonly asyncFn: (item: T) => Promise<K>,
		private readonly onFulfilled: (item: T, value: K) => void,
		readonly batchSize = 5,
		private readonly maxRetries = 3,
	) {}

	async process(): Promise<Result> {
		if (this.queueSize === 0) {
			return Promise.resolve(Result.Success);
		}

		const batchArray = this.createBatches<Queueable<T>>(
			this.queue,
			this.batchSize,
		);

		for (const batch of batchArray) {
			const promises = batch.map(this.asyncFn);

			try {
				const result = await Promise.allSettled(promises);
				result.forEach((result, j) => {
					if (result.status === 'fulfilled') {
						this.onFulfilled(batch[j], result.value);
					} else {
						if (!result.reason.code || result.reason.code === 429) {
							batch[j] = {
								...batch[j],
								[attempts]: batch[j][attempts as unknown as string] + 1,
							};

							if (batch[j][attempts as unknown as string] < this.maxRetries) {
								this.add({ ...batch[j], [toRetry]: true });
							}
						}
					}
				});

				this.queue.splice(0, Math.min(this.batchSize, batch.length));

				const hasRateLimitExceeded = result.some(
					(r) => r.status === 'rejected' && r.reason.code === 429,
				);
				const hasRejection = result.some((r) => r.status === 'rejected');

				if (hasRateLimitExceeded) {
					return Promise.resolve(Result.RateLimitExceeded);
				}

				if (hasRejection) {
					return Promise.resolve(Result.Failed);
				}

				return Promise.resolve(Result.Success);
			} catch {
				console.log('Error occured processing queue.');
			}
		}

		return Promise.resolve(Result.Failed);
	}

	add(item: T): void {
		const queueableItem: Queueable<T> = {
			...item,
			[attempts]: item[attempts] ?? 0,
			[toRetry]: item[toRetry] ?? false,
		};
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
