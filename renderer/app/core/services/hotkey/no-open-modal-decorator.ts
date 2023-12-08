import { HotkeyHandler } from "./hotkey-handler";

export function noOpenModal(_: any, __: string, descriptor: PropertyDescriptor) {
  const originalValue = descriptor.value;

  descriptor.value = function(...args: any[]) {
    if (!(this instanceof HotkeyHandler)) {
      throw new Error('@authenticated decorator can only be used in HotkeyHandler derived classes');
    }

    if ((this as HotkeyHandler).isAnyModalOpen) {
      return;
    }

    return originalValue.apply(this, args);
  }
};