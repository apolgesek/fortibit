/* eslint-disable @typescript-eslint/no-require-imports */
import { Configuration } from '@root/configuration';
import { IConfigService, getDefaultConfig } from '@root/main/services/config';
import { Product } from '@root/product';
import deepmerge from 'deepmerge';
import { app } from 'electron';
import { existsSync, mkdirSync, readFileSync, writeFile } from 'fs';
import { writeFileSync } from 'fs-extra';
import { pickBy } from 'lodash';
import * as os from 'os';
import { join } from 'path';

export const EXCLUDED_CONFIG_KEYS: (keyof Configuration)[] = [
	'schemaVersion',
	'version',
	'electronVersion',
	'nodeVersion',
	'chromiumVersion',
	'os',
	'fileExtension',
	'temporaryFileExtension',
	'workspaces',
	'e2eFilesPath',
	'organizationName',
];

function removeUndefined<T extends object>(obj: T): Partial<T> {
	return pickBy<T>(obj, (value) => value !== undefined);
}

export class ConfigService implements IConfigService {
	public get appConfig(): Configuration {
		return this._appConfig;
	}

	public get productPath(): string {
		return this._productPath;
	}

	public get workspacesPath(): string {
		return this._workspacesPath;
	}

	public get tmpDir(): string {
		return this._tmpDir;
	}

	private readonly _productPath: string;
	private readonly _workspacesPath: string;
	private readonly _tmpDir: string;

	private _appConfig: Configuration;

	constructor() {
		const configDir = join(app.getPath('appData'), app.getName(), 'config'); // app.getName returns "Electron" in test mode
		const tmpDir = join(app.getPath('appData'), app.getName(), 'tmp');
		const productPath = join(configDir, 'product.json');
		const workspacePath = join(configDir, 'workspaces.json');

		if (!existsSync(configDir)) {
			mkdirSync(configDir, { recursive: true });
		}

		if (!existsSync(tmpDir)) {
			mkdirSync(tmpDir, { recursive: true });
		}

		const productFileContent = readFileSync(
			join(global['__basedir'], 'product.json'),
			{
				encoding: 'utf8',
			},
		);

		if (!existsSync(productPath)) {
			writeFileSync(productPath, productFileContent);
		}

		if (!existsSync(workspacePath)) {
			const fileContent = readFileSync(
				join(global['__basedir'], 'workspaces.json'),
				{
					encoding: 'utf8',
				},
			);
			writeFileSync(workspacePath, fileContent);
		}

		this._productPath = productPath;
		this._workspacesPath = workspacePath;
		this._tmpDir = tmpDir;

		const productInformation: Product = deepmerge(
			JSON.parse(productFileContent),
			require(this._productPath),
		);
		const workspacesInformation = require(this._workspacesPath);

		this._appConfig = deepmerge(
			getDefaultConfig(),
			removeUndefined({
				schemaVersion: 1,
				version: app.getVersion(),
				electronVersion: process.versions.electron,
				nodeVersion: process.versions.node,
				chromiumVersion: process.versions.chrome,
				os: `${os.type()} ${os.release()}`,
				fileExtension: 'fbit',
				temporaryFileExtension: 'tmp',
				e2eFilesPath: process.env.E2E_FILES_PATH,
				workspaces: workspacesInformation,
				name: productInformation.name,
				commit: productInformation.commit,
				updateUrl: productInformation.updateUrl,
				webUrl: productInformation.webUrl,
				webApiUrl: productInformation.webApiUrl,
				cdnUrl: productInformation.cdnUrl,
				signatureSubject: productInformation.signatureSubject,
				leakedPasswordsUrl: productInformation.leakedPasswordsUrl,
				compressionEnabled: productInformation.compressionEnabled,
				autocompleteShortcut: productInformation.autocompleteShortcut,
				autocompleteUsernameOnlyShortcut:
					productInformation.autocompleteUsernameOnlyShortcut,
				autocompletePasswordOnlyShortcut:
					productInformation.autocompletePasswordOnlyShortcut,
				clipboardClearSeconds: productInformation.clipboardClearSeconds,
				biometricsAuthenticationEnabled:
					productInformation.biometricsAuthenticationEnabled,
				encryption: {
					lowercase: productInformation.encryption.lowercase,
					numbers: productInformation.encryption.numbers,
					uppercase: productInformation.encryption.uppercase,
					specialChars: productInformation.encryption.specialChars,
					passwordLength: productInformation.encryption.passwordLength,
				},
				idleSeconds: productInformation.idleSeconds,
				lockOnSystemLock: productInformation.lockOnSystemLock,
				saveOnLock: productInformation.saveOnLock,
				displayIcons: productInformation.displayIcons,
				autoTypeEnabled: productInformation.autoTypeEnabled,
				theme: productInformation.theme,
				showInsecureUrlPrompt: productInformation.showInsecureUrlPrompt,
				biometricsProtectedFiles: [],
				protectWindowsFromCapture: productInformation.protectWindowsFromCapture,
				autosaveEnabled: productInformation.autosaveEnabled,
				organizationName: null,
				scheduledReports: productInformation.scheduledReports,
			}) as Configuration,
			{
				customMerge: () => {
					return (a, b) => {
						return deepmerge(a, removeUndefined(b));
					};
				},
			},
		);
	}

	set(settings: Partial<Configuration>) {
		this._appConfig = { ...this._appConfig, ...settings };

		writeFile(
			this._productPath,
			JSON.stringify(this._appConfig, (key: keyof Configuration, value) => {
				if (EXCLUDED_CONFIG_KEYS.includes(key)) {
					return undefined;
				}

				return value;
			}),
			(error) => {
				if (error) {
					console.error(error);
				}
			},
		);
	}
}
