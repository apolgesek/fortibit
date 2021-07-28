import { app } from 'electron';
import { bootstrapApp } from './main/main';

global['__basedir'] = __dirname;

function startup() {
  const gotTheLock = app.requestSingleInstanceLock();

  if (!gotTheLock) {
    app.quit();
  } else {
    bootstrapApp();
  }
}

startup();