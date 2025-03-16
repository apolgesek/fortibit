import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, Type, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GroupId } from '@app/core/enums';
import {
	EntryManager,
	GroupManager,
	ModalService,
	NotificationService,
	WorkspaceService,
} from '@app/core/services';
import { ConfigService } from '@app/core/services/config.service';
import { PrettyShortcutComponent } from '@app/shared/components/pretty-shortcut/pretty-shortcut.component';
import { SidebarHandleComponent } from '@app/shared/components/sidebar-handle/sidebar-handle.component';
import { TooltipDirective } from '@app/shared/directives/tooltip.directive';
import { IsPasswordPipe } from '@app/shared/pipes/is-password.pipe';
import { Configuration } from '@config/configuration';
import {
	Entry,
	EntryGroup,
	IpcChannel,
	PasswordEntry,
} from '@shared-renderer/index';
import { FeatherModule } from 'angular-feather';
import { AppConfig } from 'environments/environment';
import { MessageBroker } from 'injection-tokens';
import { PasswordEntryDetailsComponent } from './password-entry-details/password-entry-details.component';
import { DropdownDirective } from '@app/shared/directives/dropdown.directive';
import { DropdownMenuDirective } from '@app/shared/directives/dropdown-menu.directive';
import { DropdownToggleDirective } from '@app/shared/directives/dropdown-toggle.directive';
import { slideDown } from '@app/shared';
import { MenuItemDirective } from '@app/shared/directives/menu-item.directive';
import { SvgComponent } from '@app/shared/components/svg/svg.component';

@Component({
	selector: 'app-details-sidebar',
	templateUrl: './details-sidebar.component.html',
	styleUrls: ['./details-sidebar.component.scss'],
	standalone: true,
	imports: [
		CommonModule,
		FeatherModule,
		SidebarHandleComponent,
		TooltipDirective,
		IsPasswordPipe,
		PrettyShortcutComponent,
		DropdownDirective,
		DropdownMenuDirective,
		DropdownToggleDirective,
		MenuItemDirective,
		SvgComponent,
	],
	animations: [slideDown],
})
export class DetailsSidebarComponent implements OnInit {
	private readonly detailsComponents = new Map<Entry['type'], Type<unknown>>([
		['password', PasswordEntryDetailsComponent],
	]);

	public group: EntryGroup;
	public config: Configuration;
	public isReadonlyEntry = true;
	public isAnimating = false;
	public entry: Entry;
	public detailsPartial: Type<unknown> = PasswordEntryDetailsComponent;

	private readonly destroyRef = inject(DestroyRef);
	private readonly messageBroker = inject(MessageBroker);
	private readonly workspaceService = inject(WorkspaceService);
	private readonly entryManager = inject(EntryManager);
	private readonly groupManager = inject(GroupManager);
	private readonly modalService = inject(ModalService);
	private readonly configService = inject(ConfigService);
	private readonly notificationService = inject(NotificationService);

	get selectedEntries(): number {
		return this.entryManager.selectedEntries.length;
	}

	get databaseInformation(): { name: string } {
		return {
			name: this.workspaceService.databaseFileName,
		};
	}

	get selectedGroup(): number {
		return this.groupManager.selectedGroup;
	}

	get isUnsecured(): boolean {
		return (
			this.entry.type === 'password' && !this.entry?.url?.startsWith('https://')
		);
	}

	ngOnInit(): void {
		this.configService.configLoadedSource$
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((config) => {
				this.config = config;
			});

		this.entryManager.selectEntry$
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((entry) => {
				if (!entry) {
					this.group = null;
					return;
				}

				this.entry = entry;
				this.group = [
					...this.groupManager.groups,
					...this.groupManager.builtInGroups,
				].find((x) => x.id === entry.groupId);
				this.isReadonlyEntry = this.group.id === GroupId.RecycleBin;
				this.entryManager.getEntryHistory(entry.id);
				this.detailsPartial = this.detailsComponents.get(this.entry.type);
			});
	}

	openAutotypeInformation() {
		const url =
			AppConfig.urls.repositoryUrl +
			AppConfig.urls.keyboardReference +
			AppConfig.urls.autotypeShortcut;
		this.messageBroker.ipcRenderer.send(IpcChannel.OpenUrl, url);
	}

	async openUrl(url: string): Promise<boolean> {
		let result = true;
		if (this.isUnsecured && this.config.showInsecureUrlPrompt) {
			result = await this.modalService.openConfirmOpenUrlWindow();
		}

		if (result) {
			this.messageBroker.ipcRenderer.send(IpcChannel.OpenUrl, url);
		}

		return result;
	}

	async toggleStarred(entry: Entry) {
		await this.entryManager.saveEntry<Entry>({
			...entry,
			isStarred: !entry.isStarred,
		});

		if (!entry.isStarred) {
			this.isAnimating = true;
			this.notificationService.add({
				message: 'Added to favorites',
				type: 'success',
				alive: 10 * 1000,
			});

			setTimeout(
				() => {
					this.isAnimating = false;
				},
				parseInt(
					getComputedStyle(document.documentElement).getPropertyValue(
						'--base-animation-duration',
					),
				),
			);
		} else {
			this.notificationService.add({
				message: 'Removed from favorites',
				type: 'success',
				alive: 10 * 1000,
			});
		}
	}

	openEditEntryWindow() {
		this.modalService.openEditEntryWindow();
	}

	openDeleteEntryWindow() {
		this.modalService.openDeleteEntryWindow();
	}

	openMoveEntryWindow() {
		this.modalService.openMoveEntryWindow();
	}

	openEntryHistoryWindow() {
		this.modalService.openEntryHistoryWindow();
	}

	async scanQrCode(entry: Entry) {
		const secret = await this.messageBroker.ipcRenderer.invoke(
			IpcChannel.ScanQrCode,
		);
		await this.entryManager.saveEntry({
			...entry,
			otpAuth: secret,
		} as PasswordEntry);
	}
}
