import { ImportHandler } from "../../../../shared";
import { IEncryptionEventWrapper } from '../../encryption';
import { IWindowService } from '../../window';
import { CsvDataImporter } from './csv-data-importer';
import { TYPE_DEF } from './type-definition';

interface IOnePasswordEntry {
  title: string;
  url: string;
  username: string;
  password: string;
  notes: string;
}

export class OnePasswordHandler extends CsvDataImporter<IOnePasswordEntry> {
  protected readonly handlerType = ImportHandler.OnePassword;
  protected readonly mock: IOnePasswordEntry = {
    title: TYPE_DEF.String,
    notes: TYPE_DEF.String,
    password: TYPE_DEF.String,
    url: TYPE_DEF.String,
    username: TYPE_DEF.String
  };

  protected readonly mapFn = (result: IOnePasswordEntry[]) => {
    return result.map(x => {
      for (const key in x) {
        if (Object.prototype.hasOwnProperty.call(x, key)) {
          x[key.toLowerCase()] = x[key];
          delete x[key];
        }
      }

      return x;
    });
  };

  constructor(
    protected readonly _windowService: IWindowService,
    protected readonly _encryptionEventWrapper: IEncryptionEventWrapper
  ) {
    super(_windowService, _encryptionEventWrapper);
  }
}