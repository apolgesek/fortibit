export interface IConfigModel {
  fileExtension: string;
  clipboardClearTimeMs: number;
  autocompleteShortcut: string;
}

export const appConfig: IConfigModel = {
  fileExtension: 'fbit',
  autocompleteShortcut: 'Alt+F',
  clipboardClearTimeMs: 15000
};