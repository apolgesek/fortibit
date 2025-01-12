import { IAsyncQueue, Result } from '../async-queue.interface';
import { BaseAsyncQueueScheduler } from './async-queue-scheduler';
import chunk from 'lodash/chunk';

export class RoundRobinScheduler extends BaseAsyncQueueScheduler {
	protected condition: boolean | (() => boolean) = () => this.items.length > 0;
	private readonly _maxConcurrentItems: number;
	private _processedQueueItemIndex = 0;
	private _chunkedItems: IAsyncQueue<unknown>[][];

	constructor(items: IAsyncQueue<unknown>[], maxConcurrentItems: number) {
		super(items, 60 * 1_000, 60 * 1_000);
		this._maxConcurrentItems = maxConcurrentItems;

		const chunkSize = Math.floor(
			this._maxConcurrentItems /
				Math.max(...this.items.map((x) => x.batchSize)),
		);
		this._chunkedItems = chunk(this.items, chunkSize);
	}

	protected async fn(): Promise<Result> {
		const result = await Promise.all(
			this._chunkedItems[this._processedQueueItemIndex].map((i) => i.process()),
		);
		if (result.some((r) => r === Result.RateLimitExceeded)) {
			return Result.RateLimitExceeded;
		} else {
			return Result.Success;
		}
	}

	protected onExecuted(): void {
		this._processedQueueItemIndex =
			this._processedQueueItemIndex === this._chunkedItems.length - 1
				? 0
				: this._processedQueueItemIndex + 1;
	}
}
