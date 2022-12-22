import { ImportHandler } from "../../../shared-models";
import { IEncryptionEventWrapper } from "../encryption";
import { IWindowService } from "../window";
import { KeePassHandler } from "./handlers/keepass-handler";
import { OnePassHandler } from "./handlers/onepass-handler";
import { IImportHandler } from "./import-handler.model";
import { IImportService } from "./import-service.model";

export class ImportService implements IImportService {
  private _handlersCache = {};
  private _handler: IImportHandler;

  constructor(
    @IWindowService private readonly _windowService: IWindowService,
    @IEncryptionEventWrapper private readonly _encryptionEventWrapper: IEncryptionEventWrapper,
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
        handler = this.create(OnePassHandler);
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

  create<T extends IImportHandler>(c: new (windowService: IWindowService, encryptionProcess: IEncryptionEventWrapper) => T): IImportHandler {
    return new c(this._windowService, this._encryptionEventWrapper);
  }
}