import { ImportHandler } from '../../../shared';
import { IEncryptionEventWrapper } from '../encryption';
import { BitwardenHandler } from './handlers/bitwarden-handler';
import { ChromeHandler } from './handlers/chrome-handler';
import { EdgeHandler } from './handlers/edge-handler';
import { FirefoxHandler } from './handlers/firefox-handler';
import { KeePassHandler } from './handlers/keepass-handler';
import { LastpassHandler } from './handlers/lastpass-handler';
import { OnePasswordHandler } from './handlers/onepassword-handler';
import { IImportHandler } from './import-handler.model';
import { IImportService } from './import-service.model';

export class ImportService implements IImportService {
	private _handlersCache = {};
	private _handler: IImportHandler;

	constructor(
		@IEncryptionEventWrapper
		private readonly _encryptionEventWrapper: IEncryptionEventWrapper,
	) {}

	setHandler(type: ImportHandler) {
		if (Object.prototype.hasOwnProperty.call(this._handlersCache, type)) {
			this._handler = this._handlersCache[type];
			return;
		}

		let handler: IImportHandler;

		switch (type) {
			case ImportHandler.KeePass:
				handler = this.create(KeePassHandler);
				break;
			case ImportHandler.OnePassword:
				handler = this.create(OnePasswordHandler);
				break;
			case ImportHandler.Bitwarden:
				handler = this.create(BitwardenHandler);
				break;
			case ImportHandler.Lastpass:
				handler = this.create(LastpassHandler);
				break;
			case ImportHandler.Chrome:
				handler = this.create(ChromeHandler);
				break;
			case ImportHandler.Firefox:
				handler = this.create(FirefoxHandler);
				break;
			case ImportHandler.Edge:
				handler = this.create(EdgeHandler);
				break;
			default:
				throw new Error('Unsupported import handler type.');
		}

		this._handler = handler;
		this._handlersCache[type] = handler;
	}

	getHandler(): IImportHandler {
		return this._handler;
	}

	create<T extends IImportHandler>(
		c: new (encryptionProcess: IEncryptionEventWrapper) => T,
	): IImportHandler {
		return new c(this._encryptionEventWrapper);
	}
}
