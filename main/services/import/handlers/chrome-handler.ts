import { ImportHandler, PasswordEntry } from '../../../../shared';
import { IEncryptionEventWrapper } from '../../encryption';
import { CsvDataImporter } from './csv-data-importer';
import { TYPE_DEF } from './type-definition';

type IChromeEntry = {
	name: string;
	url: string;
	username: string;
	password: string;
	note: string;
};

export class ChromeHandler extends CsvDataImporter<IChromeEntry> {
	protected readonly handlerType = ImportHandler.Chrome;
	protected readonly mock: IChromeEntry = {
		name: TYPE_DEF.String,
		url: TYPE_DEF.String,
		username: TYPE_DEF.String,
		password: TYPE_DEF.String,
		note: TYPE_DEF.String,
	};

	protected readonly mapFn = (
		result: IChromeEntry[],
	): Partial<PasswordEntry>[] => {
		return result.map((x) => {
			return {
				title: x.name,
				username: x.username,
				password: x.password,
				url: x.url,
				notes: x.note,
			};
		});
	};

	constructor(
		protected readonly _encryptionEventWrapper: IEncryptionEventWrapper,
	) {
		super(_encryptionEventWrapper);
	}
}
