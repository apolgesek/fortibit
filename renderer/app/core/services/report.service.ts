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

		const reportPayload = JSON.parse(report.payload);
		const reportIds: number[] = JSON.parse(report.payload).map((x) => x.id);

		const entries = (await this.entryManager.getAllByPredicate((x) =>
			reportIds.includes(x.id),
		)) as PasswordEntry[];
		const groups = await this.groupManager.getAll();

		const reportedEntries = entries.map((e) => ({
			id: e.id,
			groupName: groups.find((x) => x.id === e.groupId).name,
			title: e.title,
			username: e.username,
			occurrences: reportPayload.find((x) => x.id === e.id)
				.occurrences as number,
		}));

		return { report, entries: reportedEntries };
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

		const reportPayload = JSON.parse(report.payload);
		const reportIds: number[] = JSON.parse(report.payload).map((x) => x.id);
		const entries = (await this.entryManager.getAllByPredicate((x) =>
			reportIds.includes(x.id),
		)) as PasswordEntry[];

		const reportedEntries = entries.map((e) => ({
			id: e.id,
			title: e.title,
			username: e.username,
			score: reportPayload.find((x) => x.id === e.id).score as number,
		}));

		return { report, entries: reportedEntries };
	}

	async addReport(report: Partial<Report>): Promise<number> {
		const reports = await this.reportManager.getAllByPredicate(
			(x) => x.type === report.type,
		);

		if (reports.length >= 1) {
			await this.reportManager.delete(reports.shift().id);
		}

		return this.reportManager.add(report as Report);
	}
}
