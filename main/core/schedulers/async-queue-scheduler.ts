import { IAsyncQueue, Result } from '../async-queue.interface';
import { IAsyncScheduler } from './async-scheduler.interface';

export abstract class BaseAsyncQueueScheduler implements IAsyncScheduler {
	protected readonly items: IAsyncQueue<unknown>[];
	protected readonly rateLimitExceededMs: number;
	protected readonly successMs: number;

	private readonly _timeMarginMs = 5 * 1_000;

	protected lastResult: Result;
	protected condition: (() => boolean) | boolean = true;

	constructor(
		items: IAsyncQueue<unknown>[],
		rateLimitExceededMs: number = 60 * 1_000,
		successMs: number = 15 * 1_000,
	) {
		this.items = items;
		this.rateLimitExceededMs = rateLimitExceededMs;
		this.successMs = successMs;
	}

	public initialize() {
		this.run();
	}

	protected abstract fn(): Promise<Result>;

	protected onExecuted(): void {
		return;
	}

	private getTimeout(result: Result): number {
		switch (result) {
			case Result.RateLimitExceeded:
				return this.rateLimitExceededMs + this._timeMarginMs;
			case Result.Success:
				return this.successMs;
			default:
				return this.successMs;
		}
	}

	private async run(): Promise<void> {
		if (
			typeof this.condition === 'function' ? !this.condition() : !this.condition
		)
			return;

		this.lastResult = await this.fn();
		this.onExecuted();
		setTimeout(this.run.bind(this), this.getTimeout(this.lastResult));
	}
}
