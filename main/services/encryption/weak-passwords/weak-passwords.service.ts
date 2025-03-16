import zxcvbn from 'zxcvbn';
import { PasswordEntry } from '../../../../shared/password-entry.model';

export class WeakPasswordsService {
	public async getAll(
		entries: PasswordEntry[],
	): Promise<{ id: number; score: number }[]> {
		const result = entries.map((entry) => ({
			id: entry.id,
			score: zxcvbn(entry.password).score,
		}));

		return result.filter((entry) => entry.score < 3);
	}
}
