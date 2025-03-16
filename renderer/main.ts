import {
	APP_INITIALIZER,
	enableProdMode,
	ErrorHandler,
	importProvidersFrom,
} from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { AppComponent } from '@app/app.component';
import { DbManager } from '@app/core/database';
import { IMessageBroker } from '@app/core/models';
import {
	ClipboardService,
	ConfigService,
	ElectronService,
	EntryManager,
	GroupManager,
	ModalService,
	SvgService,
	WindowsHotkeyHandler,
	WorkspaceService,
} from '@app/core/services';
import { FileNamePipe } from '@app/shared/pipes/file-name.pipe';
import { IpcChannel } from '@shared-renderer/index';
import { FeatherModule } from 'angular-feather';
import {
	AlertCircle,
	ArrowDown,
	ArrowRight,
	ArrowUp,
	Book,
	Bookmark,
	BookOpen,
	Check,
	CheckCircle,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	ChevronUp,
	Clock,
	Code,
	Copy,
	Edit,
	Edit2,
	Eye,
	EyeOff,
	File,
	FilePlus,
	Folder,
	Globe,
	Grid,
	Heart,
	Info,
	Key,
	Link,
	Lock,
	Minus,
	MoreVertical,
	Move,
	Plus,
	PlusCircle,
	RefreshCcw,
	RefreshCw,
	Save,
	Settings,
	Share,
	Shield,
	Star,
	Trash,
	User,
	XCircle,
} from 'angular-feather/icons';
import { HotkeyHandler, MessageBroker } from 'injection-tokens';
import isElectron from 'is-electron';
import 'zone.js';
import { DefaultErrorHandler } from './app/core/errors/default-error-handler';
import { WebService } from './app/core/services/electron/web.service';
import { DarwinHotkeyHandler } from './app/core/services/hotkey/darwin-hotkey-handler';
import { routes } from './app/routes';
import { AppConfig } from './environments/environment';

type RendererWindow = Window &
	typeof globalThis & {
		api: { loadChannels: () => Promise<true | undefined> };
	};

function preloadIcons(
	svgService: SvgService,
	paths: string[],
): Promise<void>[] {
	return paths.map((p) => svgService.getFile(p));
}

function initializeApp(
	db: DbManager,
	messageBroker: IMessageBroker,
	configService: ConfigService,
	svgService: SvgService,
): () => Promise<void> {
	return async () => {
		const asyncTasks: Promise<unknown>[] = [
			...preloadIcons(svgService, [
				'icons/welcome.svg',
				'icons/windows-hello.svg',
			]),
		];

		const rendererWindow = window as RendererWindow;

		if (isElectron()) {
			asyncTasks.push(rendererWindow.api.loadChannels());
		} else {
			rendererWindow.api = {
				loadChannels: () => Object.create(null),
			};
		}

		await Promise.all(asyncTasks);
		await messageBroker.getPlatform();

		const config = await messageBroker.ipcRenderer.invoke(
			IpcChannel.GetAppConfig,
		);

		console.log(config);
		configService.setConfig(config);

		await db.delete();
		await db.create();
	};
}

if (AppConfig.production) {
	enableProdMode();
}

const icons = {
	Edit,
	Edit2,
	Trash,
	Save,
	PlusCircle,
	Grid,
	Star,
	Bookmark,
	Globe,
	Folder,
	Key,
	Info,
	User,
	Code,
	Plus,
	Minus,
	Settings,
	FilePlus,
	Check,
	CheckCircle,
	RefreshCw,
	RefreshCcw,
	ChevronLeft,
	ChevronRight,
	ChevronDown,
	ChevronUp,
	XCircle,
	AlertCircle,
	Copy,
	Link,
	Book,
	BookOpen,
	Eye,
	EyeOff,
	ArrowDown,
	ArrowUp,
	ArrowRight,
	Share,
	Heart,
	Shield,
	File,
	Lock,
	Move,
	MoreVertical,
	Clock,
};

bootstrapApplication(AppComponent, {
	providers: [
		importProvidersFrom(
			BrowserAnimationsModule,
			RouterModule.forRoot(routes, { useHash: true }),
			FeatherModule.pick(icons),
		),
		FileNamePipe,
		{
			provide: MessageBroker,
			useFactory: () => {
				if (isElectron()) {
					return new ElectronService();
				} else {
					return new WebService();
				}
			},
		},
		{
			provide: APP_INITIALIZER,
			useFactory: initializeApp,
			deps: [DbManager, MessageBroker, ConfigService, SvgService],
			multi: true,
		},
		{
			provide: HotkeyHandler,
			useFactory: (messageBroker: IMessageBroker) => {
				switch (messageBroker.platform) {
					case 'win32':
					case 'web':
						return new WindowsHotkeyHandler();
					case 'darwin':
						return new DarwinHotkeyHandler();
					default:
						throw new Error('HotkeyHandler: Unsupported platform');
				}
			},
			deps: [
				MessageBroker,
				WorkspaceService,
				EntryManager,
				GroupManager,
				ModalService,
				ClipboardService,
			],
		},
		{
			provide: ErrorHandler,
			useClass: DefaultErrorHandler,
		},
	],
}).catch((err) => console.error(err));
