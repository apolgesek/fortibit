import { IAsyncQueue, Result } from '../async-queue.interface';
import { IAsyncScheduler } from './async-scheduler.interface';

export abstract class BaseAsyncQueueScheduler implements IAsyncScheduler {
	protected readonly items: IAsyncQueue<unknown>[];
	protected readonly rateLimitExceededMs: number;
	protected readonly successMs: number;

	private readonly _timeMarginMs = 5 * 1_000;
	private readonly results: Result[] = [];

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

	private async run(): Promise<void> {
		if (
			typeof this.condition === 'function' ? !this.condition() : !this.condition
		)
			return;

		const result = await this.fn();
		this.results.unshift(result);

		if (this.results.length > 10) {
			this.results.pop();
		}

		this.onExecuted();
		setTimeout(this.run.bind(this), this.getTimeout());
	}

	private getTimeout(): number {
		const lastResult = this.results[0];

		switch (lastResult) {
			case Result.RateLimitExceeded:
				return this.getExponentialBackoffTimeout();
			case Result.Success:
				return this.successMs;
			case Result.Failed:
				return this.successMs;
			default:
				throw new Error(`Unknown result ${lastResult}`);
		}
	}

	private getExponentialBackoffTimeout(): number {
		let lastRateLimitExceededIndex =
			this.results.findIndex((x) => x === Result.Success) - 1;

		if (lastRateLimitExceededIndex < 0) {
			lastRateLimitExceededIndex = this.results.length - 1;
		}

		const timeout =
			Math.pow(2, Math.min(lastRateLimitExceededIndex, 3)) *
			this.rateLimitExceededMs;

		return timeout + this._timeMarginMs;
	}
}
