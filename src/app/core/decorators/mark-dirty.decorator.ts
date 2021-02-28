// this decorator is used for methods that should trigger database 'dirty' status
export const markDirty = () => {
  return (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => {
    if (this && !((this as unknown).constructor.name === 'storageService')) {
      throw new Error(`${markDirty.name} decorator cannot be used in current context`);
    }
    const originalMethod = descriptor.value;
    descriptor.value = function (...args: unknown[]) {
      const result = originalMethod.apply(this, args);
      this.dateSaved = undefined;
      return result;
    };
  };
};