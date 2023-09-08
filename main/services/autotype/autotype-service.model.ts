import { createServiceDecorator } from "../../dependency-injection";

export const IAutotypeService = createServiceDecorator<IAutotypeService>('autotypeService');

export interface IAutotypeService {
  registerAutocompleteShortcut(shortcut: string, usernameOnlyShortcut: string, passwordOnlyShortcut: string): void;
  autotypeEntry(title: string): void;
}