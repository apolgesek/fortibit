export interface IHotkeyStrategy {
    registerSaveDatabase: (event: KeyboardEvent) => void;
    registerDeleteEntry: (event: KeyboardEvent) => void;
    registerEditEntry: (event: KeyboardEvent) => void;
    registerAddEntry: (event: KeyboardEvent) => void;
    registerMoveUpEntry: (event: KeyboardEvent) =>  void;
    registerMoveTopEntry: (event: KeyboardEvent) =>  void;
    registerMoveDownEntry: (event: KeyboardEvent) =>  void;
    registerMoveBottomEntry: (event: KeyboardEvent) =>  void;
    registerSelectAllEntries: (event: KeyboardEvent) => void;
  }