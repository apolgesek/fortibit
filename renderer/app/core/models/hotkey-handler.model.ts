import { IHotkeyConfiguration } from './hotkey-configuration.model';

export interface IHotkeyHandler {
  configuration: IHotkeyConfiguration;
  isMultiselectionKeyDown: (event: MouseEvent) => boolean;
  intercept: (event: KeyboardEvent) => void;
  registerSaveDatabase: (event: KeyboardEvent) => void;
  registerDeleteEntry: (event: KeyboardEvent) => void;
  registerDeleteGroup: (event: KeyboardEvent) => void;
  registerRenameGroup: (event: KeyboardEvent) => void;
  registerEditEntry: (event: KeyboardEvent) => void;
  registerMoveEntry: (event: KeyboardEvent) => void;
  registerAddEntry: (event: KeyboardEvent) => void;
  registerCopyPassword: (event: KeyboardEvent) => void;
  registerCopyUsername: (event: KeyboardEvent) => void;
  registerSelectAllEntries: (event: KeyboardEvent) => void;
  registerFindEntries: (event: KeyboardEvent) => void;
  registerFindGlobalEntries: (event: KeyboardEvent) => void;
  registerLockDatabase: (event: KeyboardEvent) => void;
  registerAddGroup: (event: KeyboardEvent) => void;
  registerOpenSettings: (event: KeyboardEvent) => void;
}
