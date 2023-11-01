import { ImportHandler } from '../../../../shared';
import { IConfigService } from '../../config';
import { IEncryptionEventWrapper } from '../../encryption';
import { IWindowService } from '../../window';
import { CsvDataImporter } from './csv-data-importer';
import { TYPE_DEF } from './type-definition';

interface ILastpassEntry {
  url: string;
  username: string;
  password: string;
  totp: string;
  extra: string;
  name: string;
  grouping: string;
  fav: number;
}

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
    grouping: TYPE_DEF.String
  };

  protected readonly mapFn = (result: ILastpassEntry[]) => {
    return result
      .map(x => {
        return {
          title: x.name,
          username: x.username,
          password: x.password,
          url: x.url,
          notes: x.extra,
        };
    });
  };

  constructor(
    protected readonly _windowService: IWindowService,
    protected readonly _encryptionEventWrapper: IEncryptionEventWrapper,
    protected readonly _configService: IConfigService
  ) {
    super(_windowService, _encryptionEventWrapper, _configService);
  }
}