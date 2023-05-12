import { ChildProcess, fork } from 'child_process';
import { app } from 'electron';
import { join } from 'path';
import { ProcessArgument } from '../../../process-argument.enum';
import { INativeApiService } from '../native-api.model';
import { MessageEventType } from './message-event-type.enum';

class NativeCore {
  private static _instance: any;

  private constructor() {}

  static getInstance() {
    if (!NativeCore._instance) {
      this._instance = require('bindings')('NativeCore');
    }

    return NativeCore._instance;
  }
}

class NativeAuthProcess {
  private static _isDevMode = Boolean(app.commandLine.hasSwitch(ProcessArgument.Serve));
  private constructor() {}

  static getInstance(): ChildProcess {
    const nativeAuthModulePath = join(global['__basedir'], 'main', 'services', 'native', 'win32', 'auth.service.js');
    return fork(nativeAuthModulePath, [], { silent: true });
  };
}

export class Win32ApiService implements INativeApiService {
  pressPhraseKey(char: string): void {
    NativeCore.getInstance().pressPhraseKey(char.charCodeAt(0));
  }

  pressKey(key: number): void {
    NativeCore.getInstance().pressKey(key);
  }

  getActiveWindowTitle(): string {
    return NativeCore.getInstance().getActiveWindowTitle();
  }

  setLivePreviewBitmap(handle: Buffer, path: string): number {
    return NativeCore.getInstance().setLivePreviewBitmap(handle, path);
  }

  setThumbnailBitmap(handle: Buffer, path: string): number {
    return NativeCore.getInstance().setThumbnailBitmap(handle, path);
  }

  setIconicBitmap(handle: Buffer): number {
    return NativeCore.getInstance().setIconicBitmap(handle);
  }

  unsetIconicBitmap(handle: Buffer): number {
    return NativeCore.getInstance().unsetIconicBitmap(handle);
  }

  verifySignature(path: string, subject: string): boolean {
    return NativeCore.getInstance().certificateInfo(path) === subject && NativeCore.getInstance().verifySignature(path) === 0;
  }

  async getPassword(windowHandleHex: Buffer, dbPath: string): Promise<string> {
    return new Promise((resolve) => {
      const nativeAuth = NativeAuthProcess.getInstance();
      nativeAuth.once('message', (result) => {
        resolve(result.toString());
      });

      nativeAuth.send({ type: MessageEventType.GetPassword, windowHandleHex, dbPath });
    });
  }

  saveCredential(dbPath: string, password: string): void {
    NativeAuthProcess.getInstance().send({ type: MessageEventType.SavePassword, dbPath, password });
  }

  removeCredential(dbPath: string): void {
    NativeAuthProcess.getInstance().send({ type: MessageEventType.RemovePassword, dbPath });
  }

  listCredentials(): Promise<string[]> {
    return new Promise(resolve => {
      const nativeAuth = NativeAuthProcess.getInstance();
      nativeAuth.once('message', (result: string[]) => {
        resolve(result);
      });

      nativeAuth.send({ type: MessageEventType.ListPaths });
    });
  }
}