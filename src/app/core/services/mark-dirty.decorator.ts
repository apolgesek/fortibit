import { PasswordStoreService } from "./password-store.service";

// this decorator is used for methods that should trigger database 'dirty' status
export const markDirty = () => {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        if (this && !((this as Object).constructor.name === PasswordStoreService.name)) {
            throw new Error(`${markDirty.name} decorator cannot be used in current context`);
        }
        const originalMethod = descriptor.value;
        descriptor.value = function (...args: any[]) {
            const result = originalMethod.apply(this, args);
            (this as PasswordStoreService).dateSaved = undefined;
            return result;
        };
    };
};