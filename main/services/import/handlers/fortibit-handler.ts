import { IPasswordEntry, ImportHandler } from "../../../../shared";
import { IConfigService } from "../../config";
import { IEncryptionEventWrapper } from '../../encryption';
import { IWindowService } from '../../window';
import { CsvDataImporter } from './csv-data-importer';
import { TYPE_DEF } from './type-definition';

export class FortibitHandler extends CsvDataImporter<Partial<IPasswordEntry>> {
  protected readonly handlerType = ImportHandler.Fortibit;
  protected readonly mock: Partial<IPasswordEntry> = {
    title: TYPE_DEF.String,
    username: TYPE_DEF.String,
    password: TYPE_DEF.String,
    url: TYPE_DEF.String,
    notes: TYPE_DEF.String
  };

  protected readonly mapFn = (result: Partial<IPasswordEntry>[]) => {
    return result;
  }

  constructor(
    protected readonly _windowService: IWindowService,
    protected readonly _encryptionEventWrapper: IEncryptionEventWrapper,
    protected readonly _configService: IConfigService
  ) {
    super(_windowService, _encryptionEventWrapper, _configService);
  }
}