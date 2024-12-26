import { ImportHandler, PasswordEntry } from '../../../../shared';
import { IEncryptionEventWrapper } from '../../encryption';
import { CsvDataImporter } from './csv-data-importer';
import { TYPE_DEF } from './type-definition';

type IFirefoxEntry = {
	url: string;
	username: string;
	password: string;
	httpRealm: string;
	formActionOrigin: string;
	guid: string;
	timeCreated: number;
	timeLastUsed: number;
	timePasswordChanged: number;
};

export class FirefoxHandler extends CsvDataImporter<IFirefoxEntry> {
	protected readonly handlerType = ImportHandler.Firefox;
	protected readonly mock: IFirefoxEntry = {
		url: TYPE_DEF.String,
		username: TYPE_DEF.String,
		password: TYPE_DEF.String,
		httpRealm: TYPE_DEF.String,
		formActionOrigin: TYPE_DEF.String,
		guid: TYPE_DEF.String,
		timeCreated: TYPE_DEF.Number,
		timeLastUsed: TYPE_DEF.Number,
		timePasswordChanged: TYPE_DEF.Number,
	};

	protected readonly mapFn = (
		result: IFirefoxEntry[],
	): Partial<PasswordEntry>[] => {
		return result.map((x) => {
			return {
				username: x.username,
				password: x.password,
				url: x.url,
			};
		});
	};

	constructor(
		protected readonly _encryptionEventWrapper: IEncryptionEventWrapper,
	) {
		super(_encryptionEventWrapper);
	}
}
