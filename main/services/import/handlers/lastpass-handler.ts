import { ImportHandler, PasswordEntry } from '../../../../shared';
import { IEncryptionEventWrapper } from '../../encryption';
import { CsvDataImporter } from './csv-data-importer';
import { TYPE_DEF } from './type-definition';

type ILastpassEntry = {
	url: string;
	username: string;
	password: string;
	totp: string;
	extra: string;
	name: string;
	grouping: string;
	fav: number;
};

export class LastpassHandler extends CsvDataImporter<ILastpassEntry> {
	protected readonly handlerType = ImportHandler.Lastpass;
	protected readonly mock = {
		url: TYPE_DEF.String,
		extra: TYPE_DEF.String,
		fav: TYPE_DEF.Number,
		name: TYPE_DEF.String,
		password: TYPE_DEF.String,
		username: TYPE_DEF.String,
		totp: TYPE_DEF.String,
		grouping: TYPE_DEF.String,
	};

	protected readonly mapFn = (
		result: ILastpassEntry[],
	): Partial<PasswordEntry>[] => {
		return result.map((x) => {
			return {
				title: x.name,
				username: x.username,
				password: x.password,
				url: x.url,
				notes: x.extra,
				otpAuth: x.totp,
			};
		});
	};

	constructor(
		protected readonly _encryptionEventWrapper: IEncryptionEventWrapper,
	) {
		super(_encryptionEventWrapper);
	}
}
