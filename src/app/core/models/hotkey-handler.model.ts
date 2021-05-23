export interface IHotkeyHandler {
  registerSaveDatabase: (event: KeyboardEvent) => void;
  registerDeleteEntry: (event: KeyboardEvent) => void;
  registerEditEntry: (event: KeyboardEvent) => void;
  registerAddEntry: (event: KeyboardEvent) => void;
  registerSelectAllEntries: (event: KeyboardEvent) => void;
}