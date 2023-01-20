import { createServiceDecorator } from "../../dependency-injection";

export const IAutotypeService = createServiceDecorator<IAutotypeService>('autotypeService');

export interface IAutotypeService {
  registerAutocompleteShortcut(): void;
  autotypeEntry(title: string): void;
}