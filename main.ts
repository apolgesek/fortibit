const moduleAlias = require('module-alias');
moduleAlias.addAliases({
	'@root': __dirname,
	'@shared-renderer': __dirname + '/shared',
});

import { bootstrap } from 'global-agent';
if (process.argv.includes('--proxy')) {
	process.env.GLOBAL_AGENT_HTTP_PROXY = 'http://127.0.0.1:8080';
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

	bootstrap();
}

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
