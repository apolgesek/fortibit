import { PasswordEntry } from '../../../shared/password-entry.model';

export class WeakPasswordsService {
	private zxcvbn;

	public async getAll(
		entries: PasswordEntry[],
	): Promise<{ id: number; score: number }[]> {
		if (!this.zxcvbn) {
			this.zxcvbn = await import('zxcvbn');
		}

		return entries.map((entry) => ({
			id: entry.id,
			score: this.zxcvbn(entry.password).score,
		}));
	}
}
