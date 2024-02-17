export interface IExposedPasswordsService {
	findLeaks(
		entries: { id: any; hash: string }[],
		basedir: string,
	): Promise<{ id: any; occurrences: number }[]>;
}
