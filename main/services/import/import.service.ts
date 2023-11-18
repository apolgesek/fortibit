import { ImportHandler } from "../../../shared";
import { IConfigService } from "../config";
import { IEncryptionEventWrapper } from "../encryption";
import { IWindowService } from "../window";
import { BitwardenHandler } from "./handlers/bitwarden-handler";
import { KeePassHandler } from "./handlers/keepass-handler";
import { LastpassHandler } from "./handlers/lastpass-handler";
import { OnePasswordHandler } from "./handlers/onepassword-handler";
import { IImportHandler } from "./import-handler.model";
import { IImportService } from "./import-service.model";

export class ImportService implements IImportService {
  private _handlersCache = {};
  private _handler: IImportHandler;

  constructor(
    @IWindowService private readonly _windowService: IWindowService,
    @IEncryptionEventWrapper private readonly _encryptionEventWrapper: IEncryptionEventWrapper,
    @IConfigService private readonly _configService: IConfigService
  ) {}

  setHandler(type: ImportHandler) {
    if (this._handlersCache.hasOwnProperty(type)) {
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
      default:
        throw new Error('Unsupported import handler type.');
    }

    this._handler = handler;
    this._handlersCache[type] = handler;
  };

  getHandler(): IImportHandler {
    return this._handler;
  }

  create<T extends IImportHandler>(c: new (windowService: IWindowService, encryptionProcess: IEncryptionEventWrapper, configService: IConfigService) => T): IImportHandler {
    return new c(this._windowService, this._encryptionEventWrapper, this._configService);
  }
}