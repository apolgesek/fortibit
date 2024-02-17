import { Inject, Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { DbManager } from '@app/core/database';
import { IMessageBroker } from '@app/core/models';
import { FileNamePipe } from '@app/shared/pipes/file-name.pipe';
import { UiUtil } from '@app/utils';
import { Configuration } from '@config/configuration';
import { PasswordEntry, IpcChannel, VaultSchema } from '@shared-renderer/index';
import { exportDB, importInto } from 'dexie-export-import';
import { DexieExportJsonStructure } from 'dexie-export-import/dist/json-structure';
import { MessageBroker } from 'injection-tokens';
import { Observable, Subject, map, merge } from 'rxjs';
import { GroupId } from '../enums';
import { ConfigService } from './config.service';
import { EntryManager } from './managers/entry.manager';
import { GroupManager } from './managers/group.manager';
import { HistoryManager } from './managers/history.manager';
import { ReportManager } from './managers/report.manager';
import { ModalService } from './modal.service';
import { NotificationService } from './notification.service';
import { SearchService } from './search.service';

enum DirtyMarkType {
	Entry,
	Group,
	History,
	Report,
}

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
	public readonly loadedDatabase$: Observable<boolean>;
	public isSynced = true;
	public file?: { filePath: string; filename: string };
	public isLocked = true;
	public isBiometricsAuthenticationInProgress = false;

	private readonly loadedDatabaseSource: Subject<boolean> = new Subject();
	private config: Configuration;
	private _zoomFactor = 1;

	get zoomFactor(): number {
		return Math.round(this._zoomFactor * 100);
	}

	constructor(
		@Inject(MessageBroker) private readonly messageBroker: IMessageBroker,
		private readonly configService: ConfigService,
		private readonly entryManager: EntryManager,
		private readonly groupManager: GroupManager,
		private readonly historyManager: HistoryManager,
		private readonly reportManager: ReportManager,
		private readonly dbManager: DbManager,
		private readonly notificationService: NotificationService,
		private readonly searchService: SearchService,
		private readonly modalService: ModalService,
		private readonly fileNamePipe: FileNamePipe,
		private readonly zone: NgZone,
		private readonly router: Router,
	) {
		this.configService.configLoadedSource$.pipe().subscribe((config) => {
			this.config = config as Configuration;
		});

		merge(
			this.entryManager.markDirtySource.pipe(map(() => DirtyMarkType.Entry)),
			this.groupManager.markDirtySource.pipe(map(() => DirtyMarkType.Group)),
			this.historyManager.markDirtySource.pipe(
				map(() => DirtyMarkType.History),
			),
			this.reportManager.markDirtySource.pipe(map(() => DirtyMarkType.Report)),
		)
			.pipe()
			.subscribe(() => {
				this.isSynced = null;
				this.saveDatabaseSnapshot();
			});

		this.loadedDatabase$ = this.loadedDatabaseSource.asObservable();
		this.messageBroker.ipcRenderer.on(IpcChannel.Lock, () => {
			this.zone.run(async () => {
				if (this.config.saveOnLock && this.file) {
					if (!this.isSynced) {
						await this.saveDatabase({ notify: false });
					}

					await this.lock();
				} else {
					const success = await this.executeEvent();
					if (success) {
						await this.lock();
					}
				}
			});
		});
	}

	get databaseFileName(): string {
		return this.file?.filename ?? 'Database (new)';
	}

	async executeEvent(): Promise<boolean> {
		if (this.isSynced) {
			return Promise.resolve(true);
		} else {
			this.messageBroker.ipcRenderer.send(IpcChannel.TryClose);
			return this.modalService.openConfirmExitWindow();
		}
	}

	setDatabaseLoaded(): void {
		this.loadedDatabaseSource.next(true);
	}

	async createNew(): Promise<void> {
		await this.router.navigate(['/create-new'], {
			queryParams: { explicitNew: true },
		});

		this.groupManager.selectedGroup = null;
		this.entryManager.entryHistory = null;
		this.entryManager.editedEntry = null;
		// this.file = null;
		this.isSynced = true;

		this.entryManager.selectedPasswords = [];
		this.entryManager.passwordEntries = [];
		this.groupManager.groups = [];
		this.entryManager.updateEntriesSource();

		await this.dbManager.reset();
		await this.setupDatabase();
	}

	async lock(): Promise<void> {
		this.messageBroker.ipcRenderer.send(IpcChannel.Lock);
		await this.router.navigate(['/home']);
		this.isLocked = true;

		this.groupManager.selectedGroup = null;
		this.groupManager.groups = [];
		this.searchService.reset();
		this.entryManager.passwordEntries = [];
		this.entryManager.updateEntriesSource();

		await this.dbManager.reset();
	}

	async unlock(): Promise<void> {
		this.isLocked = false;

		await this.router.navigate(['/workspace']);
		await new Promise((resolve) => setTimeout(resolve, 200));
		this.messageBroker.ipcRenderer.send(IpcChannel.Unlock);
		UiUtil.unlockInterface();
		this.isBiometricsAuthenticationInProgress = false;

		const path = await this.messageBroker.ipcRenderer.invoke(
			IpcChannel.CheckRecoveryFile,
		);

		if (path) {
			setTimeout(() => {
				// check if workspace is locked before showing the modal
				if (this.isLocked) {
					return;
				}

				this.modalService.openRecoveryWindow(path);
			}, 1000);
		}
	}

	async saveDatabase(
		config?: { forceNew?: boolean; notify?: boolean },
		password?: string,
	): Promise<any | Error> {
		const blob = await exportDB(this.dbManager.context);

		return new Promise((resolve) => {
			const fileReader = new FileReader();
			fileReader.readAsText(blob);
			fileReader.onloadend = async () => {
				const result = await this.messageBroker.ipcRenderer.invoke(
					IpcChannel.SaveFile,
					{
						database: fileReader.result,
						password,
						config,
					},
				);

				this.handleDatabaseSaved(result);
				resolve(result);
			};
		});
	}

	async saveDatabaseSnapshot(): Promise<void | Error> {
		const blob = await exportDB(this.dbManager.context);

		return new Promise((resolve) => {
			const fileReader = new FileReader();
			fileReader.readAsText(blob);
			fileReader.onloadend = async () => {
				await this.messageBroker.ipcRenderer.invoke(
					IpcChannel.DatabaseChanged,
					{
						database: fileReader.result,
					},
				);

				resolve();
			};
		});
	}

	async loadVault(serialized: string) {
		try {
			const parsedVault: VaultSchema = JSON.parse(serialized);
			this.configService.setConfig({
				schemaVersion: parsedVault.schemaVersion,
			});
			const keys = Object.keys(this.dbManager.schemas);

			const databaseStructure: DexieExportJsonStructure = {
				formatName: 'dexie',
				formatVersion: 1,
				data: {
					databaseName: 'main',
					databaseVersion: 1,
					tables: keys.map((table) => {
						return {
							name: table,
							rowCount: parsedVault.tables[table].length,
							schema: this.dbManager.schemas[table],
						};
					}),
					data: keys.map((table) => {
						return {
							tableName: table,
							inbound: true,
							rows: parsedVault.tables[table],
						};
					}),
				},
			};

			return this.loadDatabase(JSON.stringify(databaseStructure));
		} catch (err) {
			throw new Error('Vault cannot be loaded to database', { cause: err });
		}
	}

	async loadDatabase(jsonString: string) {
		const blob = new Blob([jsonString]);

		await importInto(this.dbManager.context, blob, {
			acceptNameDiff: true,
			acceptVersionDiff: true,
			overwriteValues: true,
			clearTablesBeforeImport: true
		});
		await this.groupManager.getGroupsTree();

		this.setDatabaseLoaded();
	}

	async importDatabase(
		name: string,
		entries: PasswordEntry[],
	): Promise<boolean> {
		try {
			const groupId = await this.groupManager.addGroup({
				name,
				isImported: true,
			});
			const mappedEntries = entries.map((e) => ({ ...e, groupId }));
			await this.entryManager.bulkAdd(mappedEntries);
			const entriesWithIds = await this.entryManager.getAllByGroup(groupId);

			for (const entry of entriesWithIds) {
				if (entry.type === 'password') this.entryManager.getIconPath(entry);
			}

			// refresh All Items group after database import so new entries are visible on the list
			// likely to be extended with Favorites group the same way in the future
			if (this.groupManager.selectedGroup === GroupId.AllItems) {
				await this.entryManager.setByGroup(GroupId.AllItems);
				this.entryManager.updateEntriesSource();
			}

			return true;
		} catch (err) {
			return false;
		}
	}

	async clearDatabase(): Promise<void[] | void> {
		this.entryManager.passwordEntries = [];
		return this.dbManager.reset();
	}

	async saveNewDatabase(
		newPassword: string,
		config: { forceNew?: boolean },
	): Promise<any | Error> {
		return this.saveDatabase(config, newPassword);
	}

	async setupDatabase(): Promise<boolean> {
		await this.messageBroker.ipcRenderer.invoke(IpcChannel.RegenerateKey);

		// if (!this.file) {
		// 	await this.groupManager.setupGroups();
		// }

		return true;
	}

	async openFile(path?: string) {
		const success = await this.executeEvent();

		if (success) {
			const result = await this.messageBroker.ipcRenderer.invoke(
				IpcChannel.OpenFile,
				path,
			);
			await this.handleDatabaseLock(result);
		}
	}

	setSynced() {
		this.isSynced = true;
	}

	exitApp() {
		window.onbeforeunload = null;

		setTimeout(() => {
			this.messageBroker.ipcRenderer.send(IpcChannel.Exit);
		});
	}

	toggleTheme() {
		this.messageBroker.ipcRenderer.invoke(IpcChannel.ToggleTheme);
	}

	async zoomIn() {
		this._zoomFactor = await this.messageBroker.ipcRenderer.invoke(
			IpcChannel.ZoomIn,
		);
	}

	async zoomOut() {
		this._zoomFactor = await this.messageBroker.ipcRenderer.invoke(
			IpcChannel.ZoomOut,
		);
	}

	async resetZoom() {
		this._zoomFactor = await this.messageBroker.ipcRenderer.invoke(
			IpcChannel.ResetZoom,
		);
	}

	toggleFullscreen() {
		this.messageBroker.ipcRenderer.invoke(IpcChannel.ToggleFullscreen);
	}

	findEntries() {
		this.entryManager.isGlobalSearch = false;
		this.entryManager.selectedPasswords = [];

		UiUtil.focusSearchbox();
	}

	findGlobalEntries() {
		this.entryManager.isGlobalSearch = true;
		this.entryManager.selectedPasswords = [];

		UiUtil.focusSearchbox();
	}

	async handleDatabaseLock(filePath: string) {
		this.file = {
			filePath,
			filename: this.fileNamePipe.transform(filePath),
		};

		if (!this.isLocked) {
			await this.lock();
		}

		// navigation is needed when being on New Vault page
		this.router.navigate(['/home']);
	}

	private handleDatabaseSaved(res: any) {
		if (res.status) {
			this.file = {
				filePath: res.file,
				filename: this.fileNamePipe.transform(res.file),
			};
			this.setSynced();

			if (res.notify) {
				this.notificationService.add({
					message: 'Database saved',
					alive: 10 * 1000,
					type: 'success',
				});
			}
		} else if (res.error) {
			this.notificationService.add({
				type: 'error',
				message: 'Error occured',
				alive: 10 * 1000,
			});
		}
	}
}
