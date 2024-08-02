export interface IAsyncQueue<T> {
	process(): void;
	add(item: T): void;
}
