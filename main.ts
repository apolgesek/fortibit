import { app, BrowserWindow, ipcMain, dialog, clipboard, SaveDialogReturnValue, shell } from 'electron';

import * as path from 'path';
import * as url from 'url';
import * as fs from 'fs';
import { EncryptionProvider } from './encryption/encryption-provider';

let win: BrowserWindow = null;
const args = process.argv.slice(1),
    serve = args.some(val => val === '--serve');

let clearClipboardTimeout: NodeJS.Timeout;
let file: string;
let currentPassword: string;
let wasAppLoaded: boolean;

const ext = '.hslc';

function createWindow(): BrowserWindow {

  // Create the browser window.
  win = new BrowserWindow({
    x: 0,
    y: 0,
    width: 960,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      allowRunningInsecureContent: (serve) ? true : false,
    },
    resizable: false
  });

  if (serve) {
    require('electron-reload')(__dirname, {
      electron: require(`${__dirname}/node_modules/electron`)
    });
    win.loadURL('http://localhost:4200');
  } else {
    win.loadURL(url.format({
      pathname: path.join(__dirname, 'dist/index.html'),
      protocol: 'file:',
      slashes: true
    }));
  }

  if (serve) {
    win.webContents.openDevTools();
  }

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store window
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });

  return win;
}

try {

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.on('ready', createWindow);

  // Quit when all windows are closed.
  app.on('window-all-closed', () => {
      app.quit();
  });

  app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
      createWindow();
    }
  });

  // mac os open by file
  // TODO: support windows - process.argv
  app.on('open-file', (_, filePath) => {
    file = filePath;
  });

  ipcMain.on('saveFile', async (_, { passwordList, newPassword }) => {
    let savePath: SaveDialogReturnValue = { filePath: file, canceled: false };
    let output;
    const stringData = JSON.stringify(passwordList, (k ,v) => (k === 'parent' ? undefined : v));
    if (!file) {
      savePath = await dialog.showSaveDialog(win, {});
      output = EncryptionProvider.encryptString(stringData, newPassword);
    } else {
      output = EncryptionProvider.encryptString(stringData, currentPassword);
    }
    const finalFilePath = savePath.filePath.endsWith(ext) ? savePath.filePath : savePath.filePath + ext;

    fs.writeFile(finalFilePath, output, () => {});
    file = finalFilePath;
  });

  ipcMain.on('copyToClipboard', (_, value: string) => {
    clearTimeout(clearClipboardTimeout);
    clipboard.writeText(value);
    clearClipboardTimeout = setTimeout(() => {
      clipboard.clear();
    }, 15000);
  });

  ipcMain.on('onFileDrop', (_, filePath: string) => {
    if (!filePath.endsWith(ext)) {
      return;
    }
    file = filePath;
    win.webContents.send('providePassword', file);
  });

  ipcMain.on('authAttempt', (_, password) => {
    fs.readFile(file, (_, data) => {
      try {
        const decrypted = EncryptionProvider.decryptString(data.toString(), password);
        currentPassword = password;
        win.webContents.send('onContentDecrypt', {decrypted, file});
      } catch (e) {
        win.webContents.send('onContentDecrypt', {decrypted: '*', file});
      }
    });
  });

  ipcMain.handle('appOpenType', () => {
    if (wasAppLoaded) {
      return false;
    }
    wasAppLoaded = true;
    return file;
  });

  ipcMain.on('openUrl', (_, url: string) => {
    shell.openExternal(url.includes('http') ? '': 'http://' + url);
  });

  ipcMain.on('onCloseAttempt', () => {
    win.focus();
    win.webContents.send('openCloseConfirmationWindow');
  });

  ipcMain.on('exit', () => {
    app.quit();
  });

  app.setAboutPanelOptions({
    applicationName: "Haslock", 
    applicationVersion: "0.0.1",
    version: "0.0.1",
    copyright: "Copyright © 2020 by Arkadiusz Półgęsek",
    authors: ["Arkadiusz Półgęsek"],
  });

} catch (e) {
  // Catch Error
  // throw e;
}
