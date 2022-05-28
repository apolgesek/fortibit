import { StorageService } from '../services';

/**
 * Marks database as dirty, so that unsaved changes are detected.
 */
export const markDirty = ({ updateEntries } = { updateEntries: true }) => {
  return (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: unknown[]) {
      const result = await originalMethod.apply(this, args);

      if (!(this instanceof StorageService)) {
        throw new Error('markDirty decorator must be used only in StorageService');
      }
      // eslint-disable-next-line
      const context: StorageService = this as StorageService;

      context.dateSaved = null;
      if (updateEntries) {
        context.updateEntries();
      }

      return result;
    };
  };
};