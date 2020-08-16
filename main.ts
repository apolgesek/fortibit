import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  clipboard,
  SaveDialogReturnValue,
  shell
} from 'electron';

import * as path from 'path';
import * as url from 'url';
import * as fs from 'fs';

import { Encryptor } from './encryption/encryptor';
const version = require('./package.json').version as string;

let win: BrowserWindow = null;
const args = process.argv.slice(1),
    serve = args.some(val => val === '--serve');

let clearClipboardTimeout: NodeJS.Timeout;
let file: { filePath: string, filename: string};
let currentPassword: string;
let wasAppLoaded: boolean;

const ext = '.hslc';

function createWindow(): BrowserWindow {

  win = new BrowserWindow({
    x: 0,
    y: 0,
    width: 960,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      allowRunningInsecureContent: (serve) ? true : false,
      devTools: (serve) ? true : false,
    },
    resizable: true,
  });

  win.removeMenu();

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

  //windows open by file
  if (process.platform === 'win32' && process.argv.length >= 2) {
    file = { filePath: process.argv[1], filename: path.basename(process.argv[1]) };
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

  // macOS open by file
  app.on('open-file', (_, filePath) => {
    file = { filePath, filename: path.basename(filePath) };
  });

  ipcMain.on('saveFile', async (_, { passwordList, newPassword }) => {
    let savePath: SaveDialogReturnValue = { filePath: file?.filePath, canceled: false };
    let output;
    const stringData = JSON.stringify(passwordList, (k ,v) => (k === 'parent' ? undefined : v));
    if (!currentPassword) {
      savePath = await dialog.showSaveDialog(win, {});
      output = Encryptor.encryptString(stringData, newPassword);
      currentPassword = newPassword;
    } else {
      output = Encryptor.encryptString(stringData, currentPassword);
    }
    const finalFilePath = savePath.filePath.endsWith(ext) ? savePath.filePath : savePath.filePath + ext;

    try {
      fs.writeFile(finalFilePath, output, () => null);
      file = { filePath: finalFilePath, filename: path.basename(finalFilePath) };
      win.webContents.send('saveStatus', { status: true,  message: undefined, file });
    } catch (err) {
      win.webContents.send('saveStatus', { status: false,  message: err });
    }
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
    file = { filePath: filePath, filename: path.basename(filePath) };
    win.webContents.send('providePassword', file);
  });

  ipcMain.on('authAttempt', (_, password) => {
    fs.readFile(file.filePath, (_, data) => {
      try {
        const decrypted = Encryptor.decryptString(data.toString(), password);
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

  ipcMain.on('appVersion', () => {
    win.webContents.send('appVersion', version);
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

} catch (e) {
  // Catch Error
  // throw e;
}
