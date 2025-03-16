import { ConfigEntry } from '@shared-renderer/config-entry.model';
import { DbManager } from '../database';
import { IConfigRepository } from './config-repository.model';

export class ConfigRepository implements IConfigRepository {
	constructor(private readonly db: DbManager) {}

	getAll(): Promise<ConfigEntry[]> {
		return this.db.context.transaction('r', this.db.config, () =>
			this.db.config.toArray(),
		);
	}

	get(id: number): Promise<ConfigEntry | undefined> {
		return this.db.context.transaction('r', this.db.config, () => {
			return this.db.config.get(id);
		});
	}

	add(item: Partial<ConfigEntry>): Promise<number> {
		return this.db.context.transaction('rw', this.db.config, () =>
			this.db.config.add(item as ConfigEntry),
		);
	}

	update(item: Partial<ConfigEntry>): Promise<number> {
		return this.db.context.transaction('rw', this.db.config, () =>
			this.db.config.update(item.id, { ...item }),
		);
	}

	delete(id: number): Promise<void> {
		return this.db.context.transaction('rw', this.db.config, () =>
			this.db.config.delete(id),
		);
	}
}
