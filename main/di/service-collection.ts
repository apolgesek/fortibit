/* eslint-disable @typescript-eslint/no-explicit-any */
import { ServiceIdentifier } from './service-identifier';

export class ServiceCollection {
	private readonly _entries = new Map<ServiceIdentifier<any>, any>();

	set<T>(id: ServiceIdentifier<T>, instanceOrDescriptor: T): T {
		const result = this._entries.get(id);
		this._entries.set(id, instanceOrDescriptor);
		return result;
	}

	has(id: ServiceIdentifier<any>): boolean {
		return this._entries.has(id);
	}

	get<T>(id: ServiceIdentifier<T>): T {
		return this._entries.get(id);
	}
}
