import { stringify } from 'csv-stringify/sync';
import { writeFileSync } from 'fs';

export class CsvWriter {
	public static writeFile<T>(path: string, arr: T[], props?: (keyof T)[]) {
		if (!props) {
			props = Object.keys(arr[0]) as (keyof T)[];
		}

		const rows = arr.map((obj) => {
			return props.map((prop) => obj[prop]);
		});

		const stringified = stringify([props, ...rows], { quoted: true });
		writeFileSync(path, stringified);
	}
}
