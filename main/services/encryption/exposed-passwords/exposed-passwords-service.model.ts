export interface IExposedPasswordsService {
	findLeaks(
		entries: { id: number; hash: string }[],
		apiUrl: string,
	): Promise<{ id: number; occurrences: number }[]>;
}
