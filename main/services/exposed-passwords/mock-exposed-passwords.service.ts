import { IExposedPasswordsService } from './exposed-passwords-service.model';

export class MockExposedPasswordsService implements IExposedPasswordsService {
	findLeaks(
		entries: { id: any; hash: string }[],
		_: string,
	): Promise<{ id: any; occurrences: number }[]> {
		if (entries.length === 0) {
			return Promise.resolve([]);
		} else {
			return Promise.resolve(
				entries.map((e) => ({
					id: e.id,
					occurrences: Math.floor(Math.random() * 100) + 1,
				})),
			);
		}
	}
}
