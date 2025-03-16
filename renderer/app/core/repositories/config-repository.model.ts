import { IRepository } from './repository.model';
import { ConfigEntry } from '@shared-renderer/config-entry.model';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IConfigRepository extends IRepository<ConfigEntry> {}
