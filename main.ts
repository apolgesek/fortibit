var moduleAlias = require('module-alias');
moduleAlias.addAliases({
	'@root': __dirname,
	'@shared-renderer': __dirname + '/shared',
});

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
