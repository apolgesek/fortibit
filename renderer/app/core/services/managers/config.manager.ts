import { inject, Injectable } from '@angular/core';
import { ConfigEntry } from '@shared-renderer/config-entry.model';
import { Subject } from 'rxjs';
import { DbManager } from '../../database';
import { ConfigRepository } from '../../repositories';

@Injectable({ providedIn: 'root' })
export class ConfigManager {
	public configEntry: Partial<ConfigEntry>;
	public readonly markDirtySource = new Subject<void>();
	private readonly configRepository: ConfigRepository = new ConfigRepository(
		inject(DbManager),
	);

	async getConfig(): Promise<ConfigEntry> {
		if (this.configEntry) {
			return this.configEntry as ConfigEntry;
		}

		const configEntry = (await this.configRepository.get(1)) as ConfigEntry;
		this.configEntry = configEntry;

		return configEntry;
	}

	async add(entry: Partial<ConfigEntry>) {
		this.configEntry = entry;
		await this.configRepository.add(entry);

		this.markDirty();
	}

	async update(configEntry: ConfigEntry) {
		this.configEntry = configEntry;
		await this.configRepository.update(configEntry);

		this.markDirty();
	}

	private markDirty() {
		this.markDirtySource.next();
	}
}
