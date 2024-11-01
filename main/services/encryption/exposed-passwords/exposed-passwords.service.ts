import { request } from 'https';
import { IExposedPasswordsService } from './exposed-passwords-service.model';

export class ExposedPasswordsService implements IExposedPasswordsService {
	public async findLeaks(
		entries: { id: number; hash: string }[],
		apiUrl: string,
	): Promise<{ id: number; occurrences: number }[]> {
		try {
			const result = await Promise.all(entries.map((e) => this.find(e, apiUrl)));
			return Promise.resolve(result.flat());
		} catch (err) {
			return Promise.reject(err);
		}
	}

	private async find(entry: {
		id: number;
		hash: string;
	}, apiUrl: string): Promise<{ id: number; occurrences: number }> {
		const hashStart = entry.hash.slice(0, 5);
		const hashEnd = entry.hash.slice(5);

		return new Promise((resolve, reject) => {
			let body = '';
			// eslint-disable-next-line prefer-const
			let timeout: NodeJS.Timeout;

			const req = request(`${apiUrl}/${hashStart}`, (res) => {
				res.on('data', async (data: Buffer) => {
					body += data.toString();
				});

				res.on('end', () => {
					const foundEntry = body.match(new RegExp(`${hashEnd}:\\d+$`, 'gmi'));
					const entryObject = {
						id: entry.id,
						occurrences: 0,
					};

					if (foundEntry) {
						entryObject.occurrences = parseInt(foundEntry[0].split(':')[1]);
					}

					clearTimeout(timeout);
					resolve(entryObject);
				});

				res.on('error', (err) => {
					clearTimeout(timeout);
					reject(err);
				});
			}).on('error', (err) => {
				clearTimeout(timeout);
				reject(err);
			});

			timeout = setTimeout(() => {
				req.destroy();
				reject('Request timed out');
			}, 30_000);

			req.end();
		});
	}
}
