import { CommonModule } from '@angular/common';
import {
	Component,
	DestroyRef,
	Inject,
	OnInit,
	Type,
	ViewEncapsulation,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GroupId } from '@app/core/enums';
import { IMessageBroker } from '@app/core/models';
import {
	EntryManager,
	GroupManager,
	ModalService,
	NotificationService,
	WorkspaceService,
} from '@app/core/services';
import { ConfigService } from '@app/core/services/config.service';
import { SidebarHandleComponent } from '@app/shared/components/sidebar-handle/sidebar-handle.component';
import { TooltipComponent } from '@app/shared/components/tooltip/tooltip.component';
import { TooltipDirective } from '@app/shared/directives/tooltip.directive';
import { IsPasswordPipe } from '@app/shared/pipes/is-password.pipe';
import { LinkPipe } from '@app/shared/pipes/link.pipe';
import { TimeRemainingPipe } from '@app/shared/pipes/time-remaining.pipe';
import { Configuration } from '@config/configuration';
import { Entry, EntryGroup, IpcChannel } from '@shared-renderer/index';
import { FeatherModule } from 'angular-feather';
import { AppConfig } from 'environments/environment';
import { MessageBroker } from 'injection-tokens';
import { PasswordEntryDetailsComponent } from './password-entry-details/password-entry-details.component';

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
		TooltipComponent,
		LinkPipe,
		TimeRemainingPipe,
		IsPasswordPipe,
	],
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

	constructor(
		private readonly destroyRef: DestroyRef,
		@Inject(MessageBroker) private readonly messageBroker: IMessageBroker,
		private readonly workspaceService: WorkspaceService,
		private readonly entryManager: EntryManager,
		private readonly groupManager: GroupManager,
		private readonly modalService: ModalService,
		private readonly configService: ConfigService,
		private readonly notificationService: NotificationService,
	) {}

	get isEntrySelected(): boolean {
		return this.entryManager.selectedPasswords.length === 1;
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

	openEntryHistory() {
		this.modalService.openEntryHistoryWindow();
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
		await this.entryManager.saveEntry({
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
}
