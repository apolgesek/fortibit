import { app, BrowserWindow, ipcMain, dialog, clipboard, SaveDialogReturnValue } from 'electron';
import * as path from 'path';
import * as url from 'url';
import * as fs from 'fs';
const crypto = require('crypto');

// AES-256 Counter encryption mode
const algorithm = 'aes-256-ctr';
const ext = '.hslc';

let win: BrowserWindow = null;
let newEntryWindow: BrowserWindow = null;
const args = process.argv.slice(1),
    serve = args.some(val => val === '--serve');

let clearClipboardTimeout: NodeJS.Timeout;
let file: string;

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
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
      createWindow();
    }
  });

  ipcMain.on('openEditEntryWindow', (_, data) => {
    newEntryWindow = new BrowserWindow({
      x: 0,
      y: 0,
      width: 600,
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
      newEntryWindow.loadURL('http://localhost:4200/#/new-entry');
    } else {
      newEntryWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'dist/index.html', '#', 'new-entry'),
        protocol: 'file:',
        slashes: true
      }));
    }

    newEntryWindow.webContents.on('did-finish-load', () => {
      newEntryWindow.webContents.send('entryDataSent', data);
    });

    newEntryWindow.on('closed', () => {
      newEntryWindow = null;
    });
  });

  ipcMain.on('openNewEntryWindow', () => {
    if (newEntryWindow) {
      newEntryWindow.moveTop();
      return;
    }

    newEntryWindow = new BrowserWindow({
      x: 0,
      y: 0,
      width: 600,
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
      newEntryWindow.loadURL('http://localhost:4200/#/new-entry');
    } else {
      newEntryWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'dist/index.html', '#', 'new-entry'),
        protocol: 'file:',
        slashes: true
      }));
    }
  
    newEntryWindow.on('closed', () => {
      newEntryWindow = null;
    });
  });

  ipcMain.on('saveFile', async (_, dataSnapshot: any[]) => {
    let savePath: SaveDialogReturnValue = { filePath: file, canceled: false };
    if (!file) {
      savePath = await dialog.showSaveDialog(win, {});
    }
    const output = encrypt(dataSnapshot, 'zse4rfvcx');
    const finalFilePath = savePath.filePath.endsWith(ext) ? savePath.filePath : savePath.filePath + ext;

    fs.writeFile(finalFilePath, output.iv + ':' + output.encrypted, () => {});
    file = finalFilePath;
  });

  ipcMain.on('newEntry', (_, newEntryModel) => {
    win.webContents.send('onNewEntryAdded', newEntryModel);
    newEntryWindow.close();
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
    win.webContents.send('providePassword');
  });

  ipcMain.on('authAttempt', (_, password) => {
    fs.readFile(file, (_, data) => {
      const decrypted = decrypt(data, password);
      win.webContents.send('onContentDecrypt', decrypted);
    });
  })

} catch (e) {
  // Catch Error
  // throw e;
}

function encrypt(data: any, password: string) {
  const serializedPasswords = JSON.stringify(data);
  let keyHashed = crypto.createHash('sha256').update(password).digest('base64').substr(0, 32);
  // get random 128-bit initialization vector buffer equivalent to AES block size
  const initializationVector: Buffer = crypto.randomBytes(16);
  const cipher = crypto.Cipheriv(algorithm, keyHashed, initializationVector);
  let encrypted = cipher.update(serializedPasswords, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return { iv: initializationVector.toString('hex'), encrypted };
}

function decrypt(data: Buffer, password: string): string {
  const keyParts = data.toString().split(':');
  let keyHashed = crypto.createHash('sha256').update(password).digest('base64').substr(0, 32);
  const decipher = crypto.createDecipheriv(algorithm, keyHashed, Buffer.from(keyParts[0], 'hex'));
  let decrypted: string = decipher.update(keyParts[1], 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
