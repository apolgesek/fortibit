import { Entry } from '@shared-renderer/entry.model';

export interface IProcessor<T extends Entry> {
  afterAdd(entry: T);
	afterUpdate(entry: T, oldEntry: T, changes: (keyof T)[]);
	beforeAdd();
  beforeUpdate(entry: T, oldEntry: T, changes: (keyof T)[]);
  afterDelete(entry: T);
}
