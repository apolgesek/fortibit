import { StorageService } from '../services';

/**
 * Marks database as dirty, so that unsaved changes are detected.
 */
export const markDirty = ({ updateEntries } = { updateEntries: true }) => {
  return (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: unknown[]) {
      const result = await originalMethod.apply(this, args);

      // eslint-disable-next-line
      const context: StorageService = this as StorageService;

      context.dateSaved = undefined;
      if (updateEntries) {
        context.updateEntries();
      }

      return result;
    };
  };
};