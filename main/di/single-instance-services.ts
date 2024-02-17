import { AutotypeService, IAutotypeService } from '../services/autotype';
import { ClipboardService, IClipboardService } from '../services/clipboard';
import { IConfigService } from '../services/config';
import { ConfigService } from '../services/config/config.service';
import { DatabaseService, IDatabaseService } from '../services/database';
import {
	EncryptionEventService,
	EncryptionEventWrapper,
	IEncryptionEventService,
	IEncryptionEventWrapper,
} from '../services/encryption';
import { ExportService, IExportService } from '../services/export';
import { FileService, IFileService } from '../services/file';
import { IconService, IIconService } from '../services/icon';
import { IImportService, ImportService } from '../services/import';
import {
	DarwinApiService,
	INativeApiService,
	Win32ApiService,
} from '../services/native';
import { IPerformanceService } from '../services/performance/performance-service.model';
import { PerformanceService } from '../services/performance/performance.service';
import {
	DarwinSendInputService,
	ISendInputService,
	Win32SendInputService,
} from '../services/send-input';
import {
	DarwinCommandHandler,
	ICommandHandler,
	IUpdateService,
	UpdateService,
	Win32CommandHandler,
} from '../services/update';
import { IWindowService, WindowService } from '../services/window';
import { ServiceCollection } from './index';

export class SingleInstanceServices extends ServiceCollection {
	constructor() {
		super();
		this.configureServices();
	}

	configureServices() {
		this.set(INativeApiService, this.getNativeApiService());
		this.set(ISendInputService, this.getSendInputService());
		this.set(IConfigService, new ConfigService(this.get(INativeApiService)));
		this.set(IEncryptionEventWrapper, new EncryptionEventWrapper());
		this.set(
			IEncryptionEventService,
			new EncryptionEventService(this.get(IEncryptionEventWrapper)),
		);
		this.set(IPerformanceService, new PerformanceService());
		this.set(IFileService, new FileService());
		this.set(IClipboardService, new ClipboardService(this.get(IConfigService)));

		this.set(
			IWindowService,
			new WindowService(
				this.get(IConfigService),
				this.get(IPerformanceService),
				this.get(INativeApiService),
			),
		);

		this.set(
			IUpdateService,
			new UpdateService(
				this.get(IConfigService),
				this.get(IWindowService),
				this.get(IFileService),
				this.getCommandHandler(),
				this.get(INativeApiService),
			),
		);

		this.set(
			IIconService,
			new IconService(
				this.get(IConfigService),
				this.get(IFileService),
				this.get(IWindowService),
			),
		);

		this.set(
			IImportService,
			new ImportService(
				this.get(IWindowService),
				this.get(IEncryptionEventWrapper),
				this.get(IConfigService),
			),
		);

		this.set(
			IExportService,
			new ExportService(
				this.get(IEncryptionEventWrapper),
				this.get(IConfigService),
			),
		);

		this.set(
			IDatabaseService,
			new DatabaseService(
				this.get(IConfigService),
				this.get(IWindowService),
				this.get(IIconService),
				this.get(IImportService),
				this.get(IExportService),
				this.get(INativeApiService),
				this.get(IEncryptionEventService),
			),
		);

		this.set(
			IAutotypeService,
			new AutotypeService(
				this.get(IWindowService),
				this.get(IDatabaseService),
				this.get(IEncryptionEventWrapper),
				this.get(ISendInputService),
				this.get(IConfigService),
				this.get(INativeApiService),
			),
		);
	}

	getNativeApiService(): INativeApiService {
		if (process.platform === 'win32') {
			return new Win32ApiService();
		} else if (process.platform === 'darwin') {
			return new DarwinApiService();
		}
	}

	getSendInputService(): ISendInputService {
		if (process.platform === 'win32') {
			return new Win32SendInputService(this.get(INativeApiService));
		} else if (process.platform === 'darwin') {
			return new DarwinSendInputService(this.get(INativeApiService));
		}
	}

	getCommandHandler(): ICommandHandler {
		if (process.platform === 'win32') {
			return new Win32CommandHandler();
		} else if (process.platform === 'darwin') {
			return new DarwinCommandHandler();
		}
	}
}
