import { Injectable, inject } from '@angular/core';
import {
	ExposedPasswordEntry,
	IpcChannel,
	PasswordEntry,
	Report,
	WeakPasswordEntry,
} from '@shared-renderer/index';
import { exportDB } from 'dexie-export-import';
import { MessageBroker } from 'injection-tokens';
import { DbManager } from '../database';
import { ReportType } from '../enums';
import { EntryManager } from './managers/entry.manager';
import { GroupManager } from './managers/group.manager';
import { ReportManager } from './managers/report.manager';

type ScanResult = {
	data: string | false;
	error: string;
};

@Injectable({
	providedIn: 'root',
})
export class ReportService {
	private readonly messageBroker = inject(MessageBroker);
	private readonly db = inject(DbManager);
	private readonly reportManager = inject(ReportManager);
	private readonly entryManager = inject(EntryManager);
	private readonly groupManager = inject(GroupManager);

	private _reports: Report[] = [];

	get reports() {
		return this._reports;
	}

	async loadReports(): Promise<void> {
		this._reports = await this.reportManager.getAll();
	}

	async scanForLeaks(): Promise<ScanResult> {
		const blob = await exportDB(this.db.context);

		return new Promise((resolve, reject) => {
			const fr = new FileReader();
			fr.readAsText(blob);
			fr.onloadend = async () => {
				try {
					const data = await this.messageBroker.ipcRenderer.invoke(
						IpcChannel.ScanLeaks,
						fr.result,
					);
					resolve(data);
				} catch (err) {
					reject(err);
				}
			};
		});
	}

	async getExposedPasswords(): Promise<{
		report: Report;
		entries: ExposedPasswordEntry[];
	}> {
		const report = await this.reportManager.getLastReport(
			ReportType.ExposedPasswords,
		);

		if (!report) {
			return;
		}

		return { report, entries: JSON.parse(report.payload) };
	}

	async scanForWeakPasswords(): Promise<ScanResult> {
		const blob = await exportDB(this.db.context);

		return new Promise((resolve, reject) => {
			const fr = new FileReader();
			fr.readAsText(blob);
			fr.onloadend = async () => {
				try {
					const data = await this.messageBroker.ipcRenderer.invoke(
						IpcChannel.GetWeakPasswords,
						fr.result,
					);
					resolve(data);
				} catch (err) {
					reject(err);
				}
			};
		});
	}

	async getWeakPasswords(): Promise<{
		report: Report;
		entries: WeakPasswordEntry[];
	}> {
		const report = await this.reportManager.getLastReport(
			ReportType.WeakPasswords,
		);

		if (!report) {
			return;
		}

		return { report, entries: JSON.parse(report.payload) };
	}

	async generateReports(): Promise<void> {
		const exposedPasswords = await this.scanForLeaks();
		const weakPasswords = await this.scanForWeakPasswords();
		const creationDate = new Date();

		const exposedEntries = await this.getExposedEntries(exposedPasswords);
		const weakEntries = await this.getWeakEntries(weakPasswords);

		if (exposedPasswords.data) {
			await this.addReport({
				type: ReportType.ExposedPasswords,
				payload: JSON.stringify(exposedEntries),
				scheduled: true,
				creationDate: +creationDate,
			});
		}

		if (weakPasswords.data) {
			await this.addReport({
				type: ReportType.WeakPasswords,
				payload: JSON.stringify(weakEntries),
				scheduled: true,
				creationDate: +creationDate,
			});
		}

		if (exposedPasswords.data || weakPasswords.data) {
			this.messageBroker.ipcRenderer.send(IpcChannel.ShowNotification, {
				threats: exposedEntries.length + weakEntries.length,
			});
		}
	}

	async addReport(report: Partial<Report>): Promise<number> {
		const reportId = await this.reportManager.add(report as Report);
		this.loadReports();

		return reportId;
	}

	async getExposedEntries(result: ScanResult) {
		const reportPayload = JSON.parse(result.data as string);
		const reportIds: number[] = reportPayload.map((x) => x.id);

		const entries = (await this.entryManager.getAllByPredicate((x) =>
			reportIds.includes(x.id),
		)) as PasswordEntry[];
		const groups = await this.groupManager.getAll();

		return entries.map((e) => ({
			id: e.id,
			groupName: groups.find((x) => x.id === e.groupId).name,
			title: e.title,
			username: e.username,
			occurrences: reportPayload.find((x) => x.id === e.id)
				.occurrences as number,
		}));
	}

	async getWeakEntries(result: ScanResult) {
		const reportPayload = JSON.parse(result.data as string);
		const reportIds: number[] = reportPayload.map((x) => x.id);
		const entries = (await this.entryManager.getAllByPredicate((x) =>
			reportIds.includes(x.id),
		)) as PasswordEntry[];

		return entries.map((e) => ({
			id: e.id,
			title: e.title,
			username: e.username,
			score: reportPayload.find((x) => x.id === e.id).score as number,
		}));
	}
}
