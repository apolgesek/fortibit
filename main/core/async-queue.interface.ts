export enum Result {
	Failed,
	RateLimitExceeded,
	Success,
}

export interface IAsyncQueue<T> {
	readonly batchSize: number;
	get queueSize(): number;
	process(): Promise<Result>;
	add(item: T): void;
}
