import { CommonModule } from '@angular/common';
import {
	Component,
	DestroyRef,
	Inject,
	NgZone,
	OnDestroy,
	OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IHotkeyHandler, IMessageBroker } from '@app/core/models';
import { ModalService } from '@app/core/services';
import { slideDown } from '@app/shared';
import { DropdownMenuDirective } from '@app/shared/directives/dropdown-menu.directive';
import { DropdownToggleDirective } from '@app/shared/directives/dropdown-toggle.directive';
import { DropdownDirective } from '@app/shared/directives/dropdown.directive';
import { MenuItemDirective } from '@app/shared/directives/menu-item.directive';
import { MenuDirective } from '@app/shared/directives/menu.directive';
import { TooltipDirective } from '@app/shared/directives/tooltip.directive';
import { IpcChannel, UpdateState } from '@shared-renderer/index';
import { FeatherModule } from 'angular-feather';
import { HotkeyHandler, MessageBroker } from 'injection-tokens';
import { Observable, Subject, scan, startWith } from 'rxjs';

type Notification = {
	type: 'update' | 'warning';
	content: string;
};

@Component({
	selector: 'app-settings-button',
	templateUrl: './settings-button.component.html',
	styleUrls: ['./settings-button.component.scss'],
	standalone: true,
	imports: [
		CommonModule,
		FeatherModule,
		MenuDirective,
		DropdownDirective,
		DropdownToggleDirective,
		DropdownMenuDirective,
		MenuItemDirective,
		TooltipDirective,
	],
	animations: [slideDown],
})
export class SettingsButtonComponent implements OnInit, OnDestroy {
	public readonly notifications$: Observable<Notification[]>;
	public updateAvailable = '';
	public settingsLabel: string;
	private readonly notificationsSource = new Subject<Notification>();
	private updateListener: (
		event: any,
		state: UpdateState,
		version: string,
	) => void;

	constructor(
		@Inject(MessageBroker) private readonly messageBroker: IMessageBroker,
		@Inject(HotkeyHandler) private readonly hotkeyHandler: IHotkeyHandler,
		private readonly destroyRef: DestroyRef,
		private readonly zone: NgZone,
		private readonly modalService: ModalService,
	) {
		this.notifications$ = this.notificationsSource.asObservable().pipe(
			scan((acc, n: Notification) => {
				const updateNotificationIndex = acc.findIndex(
					(x) => x.type === 'update',
				);

				if (updateNotificationIndex > -1 && n.type === 'update') {
					acc[updateNotificationIndex] = n;
				} else {
					acc.push(n);
				}

				return acc;
			}, [] as Notification[]),
			startWith([]),
			takeUntilDestroyed(this.destroyRef),
		);

		this.updateListener = (_: any, state: UpdateState, version: string) => {
			this.zone.run(() => {
				if (state !== UpdateState.Downloaded) {
					return;
				}

				this.updateAvailable = version;
				this.notificationsSource.next({ type: 'update', content: version });
			});
		};

		this.messageBroker.ipcRenderer.on(
			IpcChannel.UpdateState,
			this.updateListener,
		);
	}

	openSettings() {
		this.modalService.openSettingsWindow();
	}

	openAboutWindow() {
		this.modalService.openAboutWindow();
	}

	ngOnInit(): void {
		this.settingsLabel = this.hotkeyHandler.getContextMenuLabel('OpenSettings');
		this.messageBroker.ipcRenderer.send(IpcChannel.GetUpdateState);
	}

	ngOnDestroy() {
		this.messageBroker.ipcRenderer.off(
			IpcChannel.UpdateState,
			this.updateListener,
		);
	}

	getNotificationTypeColor(notifications: Notification[]): 'update' | 'mixed' {
		if (notifications.length === 1 && notifications[0].type === 'update') {
			return 'update';
		} else {
			return 'mixed';
		}
	}
}
