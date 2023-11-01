import { ImportHandler, IPasswordEntry } from '../../../../shared';
import { IConfigService } from '../../config';
import { IEncryptionEventWrapper } from '../../encryption';
import { IWindowService } from '../../window';
import { XmlDataImporter } from './xml-data-importer';

export class KeePassHandler extends XmlDataImporter {
  protected handlerType = ImportHandler.KeePass;
  protected mapFn = (data: any) => {
    const groups = data.KeePassFile.Root.Group;
    return Array.isArray(groups) ? groups.map(x => this.mapEntries(x)).flat() : this.mapEntries(groups.Entry);
  };

  constructor(
    protected readonly _windowService: IWindowService,
    protected readonly _encryptionEventWrapper: IEncryptionEventWrapper,
    protected readonly _configService: IConfigService
  ) {
    super(_windowService, _encryptionEventWrapper, _configService)
  }

  private mapEntries(entries: any[]): Partial<IPasswordEntry>[] {
    return entries.map(x => {
      return {
        username: x.String.find(x => x.Key === 'UserName').Value?.toString(),
        password: x.String.find(x => x.Key === 'Password').Value?.toString(),
        title: x.String.find(x => x.Key === 'Title').Value?.toString(),
        url: x.String.find(x => x.Key === 'URL').Value?.toString(),
        notes: x.String.find(x => x.Key === 'Notes').Value?.toString(),
      };
    });
  }
}