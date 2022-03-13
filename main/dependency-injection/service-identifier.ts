export interface ServiceIdentifier<T> {
  type: T;
	(...args: any[]): void;
}