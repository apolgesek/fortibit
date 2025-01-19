import { app } from 'electron';
import * as winston from 'winston';
import { getDateString } from '../../util/date-util';

export class Logger {
	private static _instance: winston.Logger;

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	private constructor() {}

	static get instance(): winston.Logger {
		if (!Logger._instance) {
			const logPath = app.getPath('logs');

			Logger._instance = winston.createLogger({
				format: winston.format.combine(
					winston.format.errors({ stack: true }),
					winston.format.colorize(),
					winston.format.timestamp(),
					winston.format.prettyPrint(),
				),
				transports: [
					new winston.transports.Console(),
					new winston.transports.File({
						dirname: logPath,
						filename: `error_${getDateString()}.log`,
					}),
				],
			});
		}

		return Logger._instance;
	}

	static logError(error: Error): void {
		Logger.instance.error(error);
	}
}
