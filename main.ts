import { app } from 'electron';
import { bootstrapApp } from './main/main';

global['__perfStart'] = performance.now();
global['__basedir'] = __dirname;

class Startup {
  constructor() {
    const gotTheLock = app.requestSingleInstanceLock();

    if (!gotTheLock) {
      app.quit();
    } else {
      bootstrapApp();
    }
  }
}

new Startup();