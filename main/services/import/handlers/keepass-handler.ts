import { ImportHandler, PasswordEntry } from '../../../../shared';
import { IEncryptionEventWrapper } from '../../encryption';
import { XmlDataImporter } from './xml-data-importer';

export class KeePassHandler extends XmlDataImporter<any> {
	protected handlerType = ImportHandler.KeePass;
	protected mapFn = (data) => {
		const groups = data.KeePassFile.Root.Group;
		return Array.isArray(groups)
			? groups.map((x) => this.mapEntries(x)).flat()
			: this.mapEntries(groups.Entry);
	};

	constructor(
		protected readonly _encryptionEventWrapper: IEncryptionEventWrapper,
	) {
		super(_encryptionEventWrapper);
	}

	private mapEntries(entries: any[]): Partial<PasswordEntry>[] {
		return entries.map((x) => {
			return {
				username: x.String.find((x) => x.Key === 'UserName').Value?.toString(),
				password: x.String.find((x) => x.Key === 'Password').Value?.toString(),
				title: x.String.find((x) => x.Key === 'Title').Value?.toString(),
				url: x.String.find((x) => x.Key === 'URL').Value?.toString(),
				notes: x.String.find((x) => x.Key === 'Notes').Value?.toString(),
			};
		});
	}
}
