import { BrowserWindow } from 'electron';

export class StateStore {
  public static memoryKey: string;
  public static currentPassword: Buffer;
  public static windows: BrowserWindow[];
  public static fileMap: Map<number, string>;
}