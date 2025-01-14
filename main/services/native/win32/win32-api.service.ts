import { ProcessArgument } from '@root/main/process-argument.enum';
import { IConfigService } from '@root/main/services/config';
import { INativeApiService } from '@root/main/services/native';
import { ChildProcess, fork } from 'child_process';
import { app } from 'electron';
import { join } from 'path';
import { MessageEventType } from './message-event-type.enum';
import { hexToUtf8, utf8ToHex } from '../utils';

class NativeCore {
	private static _instance;

	static getInstance() {
		if (!NativeCore._instance) {
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			this._instance = require('bindings')('NativeCore');
		}

		return NativeCore._instance;
	}
}

class NativeAuthProcess {
	static getInstance(configService: IConfigService): ChildProcess {
		const nativeAuthModulePath = join(
			global['__basedir'],
			'main',
			'services',
			'native',
			'win32',
			'auth.service.js',
		);
		return fork(nativeAuthModulePath, [], {
			silent: false,
			env: { CREDENTIAL_PREFIX: configService.appConfig.name },
		});
	}
}

export class Win32ApiService implements INativeApiService {
	constructor(
		@IConfigService private readonly _configService: IConfigService,
	) {}

	private readonly _isTestMode = Boolean(
		app.commandLine.hasSwitch(ProcessArgument.E2E),
	);

	readRegistryKey(key: string, value: string): string | null {
		return NativeCore.getInstance().readRegistryKey(key, value);
	}

	pressPhraseKey(char: string): void {
		NativeCore.getInstance().pressPhraseKey(char.charCodeAt(0));
	}

	pressKey(key: number): void {
		NativeCore.getInstance().pressKey(key);
	}

	getActiveWindowTitle(): string {
		return NativeCore.getInstance().getActiveWindowTitle();
	}

	setLivePreviewBitmap(
		handle: Buffer,
		path: string,
		theme: 'dark' | 'light',
	): number {
		return NativeCore.getInstance().setLivePreviewBitmap(handle, path, theme);
	}

	setThumbnailBitmap(
		handle: Buffer,
		path: string,
		theme: 'dark' | 'light',
	): number {
		return NativeCore.getInstance().setThumbnailBitmap(handle, path, theme);
	}

	setIconicBitmap(handle: Buffer): number {
		return NativeCore.getInstance().setIconicBitmap(handle);
	}

	unsetIconicBitmap(handle: Buffer): number {
		return NativeCore.getInstance().unsetIconicBitmap(handle);
	}

	verifySignature(path: string, subject: string): boolean {
		return (
			NativeCore.getInstance().certificateInfo(path) === subject &&
			NativeCore.getInstance().verifySignature(path) === 0
		);
	}

	async getPassword(windowHandleHex: Buffer, dbPath: string): Promise<string> {
		return new Promise((resolve) => {
			if (this._isTestMode) return resolve('test123');

			const nativeAuth = NativeAuthProcess.getInstance(this._configService);
			nativeAuth.once('message', (result) => {
				resolve(result.toString());
			});

			nativeAuth.send({
				type: MessageEventType.GetPassword,
				windowHandleHex,
				dbPath: utf8ToHex(dbPath),
			});
		});
	}

	saveCredential(dbPath: string, password: string): void {
		NativeAuthProcess.getInstance(this._configService).send({
			type: MessageEventType.SavePassword,
			dbPath: utf8ToHex(dbPath),
			password,
		});
	}

	removeCredential(dbPath: string): void {
		NativeAuthProcess.getInstance(this._configService).send({
			type: MessageEventType.RemovePassword,
			dbPath: utf8ToHex(dbPath),
		});
	}

	listCredentials(): Promise<string[]> {
		return new Promise((resolve) => {
			const nativeAuth = NativeAuthProcess.getInstance(this._configService);
			nativeAuth.once('message', (result: string[]) => {
				resolve(result.map((r) => hexToUtf8(r)));
			});

			nativeAuth.send({ type: MessageEventType.ListPaths });
		});
	}
}
