import { BrowserWindow } from "electron";

export interface IWindow {
  browserWindow: BrowserWindow;
  key: string;
  autocompleteListener?: (...args) => void | Promise<void>;
}