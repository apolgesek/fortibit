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
import { IWebApiService, WebApiService } from '../services/web-api';
import { IWindowService, WindowService } from '../services/window';
import { ServiceCollection } from './index';
import {
	AutotypeIpcEventHandler,
	ClipboardIpcEventHandler,
	ConfigIpcEventHandler,
	DatabaseIpcEventHandler,
	ExportIpcEventHandler,
	IAutotypeIpcEventHandler,
	IClipboardIpcEventHandler,
	IConfigIpcEventHandler,
	IDatabaseIpcEventHandler,
	IExportIpcEventHandler,
	IIconIpcEventHandler,
	IImportIpcEventHandler,
	IUpdateIpcEventHandler,
	IWindowIpcEventHandler,
	IconIpcEventHandler,
	ImportIpcEventHandler,
	UpdateIpcEventHandler,
	WindowIpcEventHandler,
} from '../ipc';

export class SingleInstanceServices extends ServiceCollection {
	constructor() {
		super();
		this.configureServices();
	}

	configureServices() {
		this.set(INativeApiService, this.getNativeApiService());
		this.set(ISendInputService, this.getSendInputService());
		this.set(IConfigService, new ConfigService());
		this.set(
			IEncryptionEventWrapper,
			new EncryptionEventWrapper(this.get(IConfigService)),
		);
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
			IWebApiService,
			new WebApiService(this.get(IConfigService), this.get(IWindowService)),
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
				this.get(IWebApiService),
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

		this.set(
			IDatabaseIpcEventHandler,
			new DatabaseIpcEventHandler(
				this.get(IDatabaseService),
				this.get(IWindowService),
				this.get(INativeApiService),
				this.get(IConfigService),
			),
		);

		this.set(
			IWindowIpcEventHandler,
			new WindowIpcEventHandler(
				this.get(IWindowService),
				this.get(IConfigService),
				this.get(INativeApiService),
			),
		);

		this.set(
			IIconIpcEventHandler,
			new IconIpcEventHandler(this.get(IIconService), this.get(IWindowService)),
		);

		this.set(
			IConfigIpcEventHandler,
			new ConfigIpcEventHandler(
				this.get(IConfigService),
				this.get(INativeApiService),
			),
		);

		this.set(
			IAutotypeIpcEventHandler,
			new AutotypeIpcEventHandler(
				this.get(IWindowService),
				this.get(IAutotypeService),
			),
		);

		this.set(
			IImportIpcEventHandler,
			new ImportIpcEventHandler(
				this.get(IImportService),
				this.get(IConfigService),
				this.get(IWindowService),
			),
		);

		this.set(
			IExportIpcEventHandler,
			new ExportIpcEventHandler(
				this.get(IExportService),
				this.get(IWindowService),
			),
		);

		this.set(
			IUpdateIpcEventHandler,
			new UpdateIpcEventHandler(
				this.get(IUpdateService),
				this.get(IWindowService),
			),
		);

		this.set(
			IClipboardIpcEventHandler,
			new ClipboardIpcEventHandler(this.get(IClipboardService)),
		);
	}

	getNativeApiService(): INativeApiService {
		switch (process.platform) {
			case 'win32':
				return new Win32ApiService();
			case 'darwin':
				return new DarwinApiService();
			default:
				throw new Error(`Unsupported platform: ${process.platform}`);
		}
	}

	getSendInputService(): ISendInputService {
		switch (process.platform) {
			case 'win32':
				return new Win32SendInputService(this.get(INativeApiService));
			case 'darwin':
				return new DarwinSendInputService(this.get(INativeApiService));
			default:
				throw new Error(`Unsupported platform: ${process.platform}`);
		}
	}

	getCommandHandler(): ICommandHandler {
		switch (process.platform) {
			case 'win32':
				return new Win32CommandHandler();
			case 'darwin':
				return new DarwinCommandHandler();
			default:
				throw new Error(`Unsupported platform: ${process.platform}`);
		}
	}
}
