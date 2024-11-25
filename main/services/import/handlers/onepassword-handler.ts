import { ImportHandler, PasswordEntry } from '../../../../shared';
import { IEncryptionEventWrapper } from '../../encryption';
import { CsvDataImporter } from './csv-data-importer';
import { TYPE_DEF } from './type-definition';

type IOnePasswordEntry = {
	Title: string;
	Url: string;
	Username: string;
	Password: string;
	Notes: string;
	OTPAuth: string;
};

export class OnePasswordHandler extends CsvDataImporter<IOnePasswordEntry> {
	protected readonly handlerType = ImportHandler.OnePassword;
	protected readonly mock: IOnePasswordEntry = {
		Title: TYPE_DEF.String,
		Notes: TYPE_DEF.String,
		Password: TYPE_DEF.String,
		Url: TYPE_DEF.String,
		Username: TYPE_DEF.String,
		OTPAuth: TYPE_DEF.String,
	};

	protected readonly mapFn = (result: IOnePasswordEntry[]) => {
		return result.map((x) => {
			return {
				title: x.Title,
				url: x.Url,
				username: x.Username,
				password: x.Password,
				notes: x.Notes,
				otpAuth: x.OTPAuth,
			};
		}) as Partial<PasswordEntry>[];
	};

	constructor(
		protected readonly _encryptionEventWrapper: IEncryptionEventWrapper,
	) {
		super(_encryptionEventWrapper);
	}
}
