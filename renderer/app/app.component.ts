import { DOCUMENT } from '@angular/common';
import {
	AfterViewInit,
	Component,
	HostListener,
	OnInit,
	ViewContainerRef,
	inject,
} from '@angular/core';
import { NavigationStart, Router, RouterModule } from '@angular/router';
import { Configuration } from '@config/configuration';
import { IpcChannel } from '@shared-renderer/index';
import { HotkeyHandler, MessageBroker } from 'injection-tokens';
import { filter, fromEvent, take, tap } from 'rxjs';
import { AppConfig } from '../environments/environment';
import {
	AppViewContainer,
	ConfigService,
	EntryManager,
	ModalManager,
	NotificationService,
	UpdateService,
	WorkspaceService,
} from './core/services';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	standalone: true,
	imports: [RouterModule],
})
export class AppComponent implements OnInit, AfterViewInit {
	public fontsLoaded = false;
	private config: Configuration;

	private readonly messageBroker = inject(MessageBroker);
	private readonly hotkeyHandler = inject(HotkeyHandler);
	private readonly document = inject(DOCUMENT);
	private readonly router = inject(Router);
	private readonly configService = inject(ConfigService);
	private readonly modalManager = inject(ModalManager);
	private readonly appViewContainer = inject(AppViewContainer);
	private readonly viewContainerRef = inject(ViewContainerRef);
	private readonly workspaceService = inject(WorkspaceService);
	private readonly entryManager = inject(EntryManager);
	private readonly updateService = inject(UpdateService);
	private readonly notificationService = inject(NotificationService);

	// preventing dragenter and dragover events is neccesary to fire drop event for file drag&drop
	@HostListener('document:dragenter', ['$event'])
	@HostListener('document:dragover', ['$event'])
	onDragEnterOrOver(event: DragEvent) {
		event.preventDefault();
	}

	async ngOnInit(): Promise<void> {
		this.appViewContainer.appViewContainerRef = this.viewContainerRef;

		this.closeModalsOnRouteChange();
		this.configService.configLoadedSource$.pipe(take(1)).subscribe((config) => {
			this.config = config;
			this.registerGlobalEvents();
		});

		try {
			await this.preloadFonts();
			this.fontsLoaded = true;
		} catch {
			console.log('Failed to fetch fonts');
		}

		this.updateService.initialize();
	}

	ngAfterViewInit(): void {
		/* On app startup, the animation is initially run with a negative z-index, making it
      hidden from the user. This workaround aims to mitigate glitches that may occur
      during the first run of the animation. With hardware accelaration turned off the issue does not occur which
      indicates that the root cause may be low end/integrated GPU requiring more resources on cold run.
    */
		requestAnimationFrame(() => {
			this.notificationService.add({
				message: '',
				type: 'success',
				alive: 200,
				style: 'z-index: -9999',
				showCount: false,
			});
		});

		this.document.documentElement.style.setProperty(
			'--device-pixel-ratio',
			window.devicePixelRatio.toString(),
		);

		fromEvent(window, 'keydown')
			.pipe(
				tap((event: Event) => {
					this.hotkeyHandler.intercept(event as KeyboardEvent);
				}),
			)
			.subscribe();
	}

	private registerGlobalEvents() {
		this.handleMouseClick();
		this.onFileDrop();
		this.handleEntryDeselection();
		this.handleAppExit();
	}

	private preloadFonts(): Promise<FontFace[]> {
		const fontsArray = [];
		document.fonts.forEach((x) => fontsArray.push(x));

		return Promise.all(
			fontsArray.map((x) => x.status === 'unloaded' && x.load()),
		);
	}

	private closeModalsOnRouteChange() {
		this.router.events
			.pipe(filter((e) => e instanceof NavigationStart))
			.subscribe(() => {
				this.modalManager.openedModals.forEach((m) =>
					this.modalManager.close(m),
				);
			});
	}

	private handleMouseClick() {
		fromEvent(window, 'mouseup').subscribe(() => (event: MouseEvent) => {
			// Block back/forward navigation mouse side buttons
			if (event.button === 3 || event.button === 4) {
				event.preventDefault();
			}
		});
	}

	private handleAppExit() {
		const productionMode = AppConfig.environment === 'PROD';

		if (productionMode) {
			window.onbeforeunload = async (event: Event) => {
				event.returnValue = false;
				const exit = await this.workspaceService.executeEvent();
				if (exit) {
					this.workspaceService.exitApp();
				}
			};
		}
	}

	private handleEntryDeselection() {
		fromEvent(this.document, 'mousedown').subscribe(
			() => (event: MouseEvent) => {
				if (this.isOutsideClick(event)) {
					this.entryManager.selectedEntries = [];
				}
			},
		);
	}

	private onFileDrop() {
		fromEvent(this.document, 'drop').subscribe(async (event: Event) => {
			event.preventDefault();
			const dataTransfer = (event as DragEvent).dataTransfer as DataTransfer;

			if (dataTransfer.files.length) {
				const file = dataTransfer.files[0];
				const filePath =
					this.messageBroker.ipcRenderer.webUtils.getPathForFile(file);

				if (!filePath.endsWith(this.config.fileExtension)) {
					return;
				}

				const success = await this.workspaceService.executeEvent();
				if (success) {
					const result = await this.messageBroker.ipcRenderer.invoke(
						IpcChannel.DropFile,
						filePath,
					);
					await this.workspaceService.handleDatabaseLock(result);
				}
			}
		});
	}

	private isOutsideClick(event: MouseEvent) {
		const targetElement = event.target as Element;
		return !targetElement.closest('[data-prevent-entry-deselect]');
	}
}
