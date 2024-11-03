import { BaseAsyncQueueScheduler } from './async-queue-scheduler';
import { IAsyncQueue, Result } from '../async-queue.interface';

export class SimpleScheduler extends BaseAsyncQueueScheduler {
  constructor(item: IAsyncQueue<unknown>) {
		super([item]);
	}

	protected fn(): Promise<Result> {
		return this.items[0].process();
	}
}