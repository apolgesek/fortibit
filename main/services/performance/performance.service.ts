import { app } from 'electron';
import { performance } from 'perf_hooks';
import * as winston from 'winston';
import { ProcessArgument } from '../../process-argument.enum';
import { IPerformanceService } from './performance-service.model';

export class PerformanceService implements IPerformanceService {
	private readonly _performanceLoggingEnabled = Boolean(
		app.commandLine.hasSwitch(ProcessArgument.PerfLog),
	);
	private readonly logger: winston.Logger;

	constructor() {
		const directoryPath = app.getPath('logs');
		const date = new Date().toISOString().split('T')[0];

		this.logger = winston.createLogger({
			transports: [
				new winston.transports.Console(),
				new winston.transports.File({
					dirname: directoryPath,
					filename: `performance-${date}.log`,
				}),
			],
		});
	}

	mark(description: string) {
		if (!this._performanceLoggingEnabled) {
			return;
		}

		const time = performance.now();
		this.logger.log(
			'info',
			`${description} | ${Math.round(time - global['__perfStart']).toString()} ms`,
		);
	}
}
