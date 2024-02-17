import { ImportHandler } from '../../../../shared';
import { IConfigService } from '../../config';
import { IEncryptionEventWrapper } from '../../encryption';
import { IWindowService } from '../../window';
import { CsvDataImporter } from './csv-data-importer';
import { TYPE_DEF } from './type-definition';

type IBitwardenEntry = {
	folder: string;
	favorite: number;
	type: string;
	name: string;
	notes: string;
	fields: string;
	reprompt: number;
	login_uri: string;
	login_username: string;
	login_password: string;
	login_totp: string;
};

export class BitwardenHandler extends CsvDataImporter<IBitwardenEntry> {
	protected readonly handlerType = ImportHandler.Bitwarden;
	protected readonly mock: IBitwardenEntry = {
		folder: TYPE_DEF.String,
		favorite: TYPE_DEF.Number,
		type: TYPE_DEF.String,
		login_password: TYPE_DEF.String,
		login_totp: TYPE_DEF.String,
		login_username: TYPE_DEF.String,
		login_uri: TYPE_DEF.String,
		name: TYPE_DEF.String,
		notes: TYPE_DEF.String,
		reprompt: TYPE_DEF.Number,
		fields: TYPE_DEF.String,
	};

	protected readonly mapFn = (result: IBitwardenEntry[]) => {
		return result
			.filter((x) => x.type === 'login')
			.map((x) => {
				return {
					title: x.name,
					username: x.login_username,
					password: x.login_password,
					url: x.login_uri,
					notes: x.notes,
				};
			});
	};

	constructor(
		protected readonly _windowService: IWindowService,
		protected readonly _encryptionEventWrapper: IEncryptionEventWrapper,
		protected readonly _configService: IConfigService,
	) {
		super(_windowService, _encryptionEventWrapper, _configService);
	}
}
