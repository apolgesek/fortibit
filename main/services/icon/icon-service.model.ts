import { IPasswordEntry } from "../../../shared-models";
import { createServiceDecorator } from "../../dependency-injection";

export const IIconService = createServiceDecorator<IIconService>('iconService');

export interface IIconService {
  tryGetIcon(url: string): Promise<string>;
  tryReplaceIcon(currentUrl: string, newUrl: string): Promise<string>;
  removeIcon(url: string): Promise<boolean>;
  getIcons(windowId: number, entries: IPasswordEntry[]): void;
  fixIcons(entries: IPasswordEntry[]): IPasswordEntry[];
}