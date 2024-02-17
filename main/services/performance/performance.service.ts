import { app } from 'electron';
import { appendFileSync } from 'fs-extra';
import * as os from 'os';
import { join } from 'path';
import { performance } from 'perf_hooks';
import { ProcessArgument } from '../../process-argument.enum';
import { IPerformanceService } from './performance-service.model';

export class PerformanceService implements IPerformanceService {
	private readonly _performanceLogging = Boolean(
		app.commandLine.hasSwitch(ProcessArgument.PerfLog),
	);

	constructor() {
		app.setAppLogsPath(join(app.getPath('appData'), 'fortibit', 'logs'));
	}

	mark(description: string) {
		if (!this._performanceLogging) {
			return;
		}

		const time = performance.now();
		const directoryPath = app.getPath('logs');

		const filePath = join(directoryPath, `performance_${description}.txt`);
		appendFileSync(
			filePath,
			(time - global['__perfStart']).toString() + ' ms' + os.EOL,
		);
	}
}
