import { PasswordEntry } from "../../../shared";
import { createServiceDecorator } from "../../dependency-injection";

export const IIconService = createServiceDecorator<IIconService>('iconService');

export interface IIconService {
  tryGetIcon(url: string): Promise<string>;
  tryReplaceIcon(currentUrl: string, newUrl: string): Promise<string>;
  removeIcon(url: string): Promise<boolean>;
  getIcons(windowId: number, entries: PasswordEntry[]): void;
  fixIcons(entries: PasswordEntry[]): PasswordEntry[];
}