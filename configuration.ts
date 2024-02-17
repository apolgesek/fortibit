import { Product } from './product';

export type Configuration = Product & {
	schemaVersion: number;
	fileExtension: string;
	version?: string;
	electronVersion?: string;
	nodeVersion?: string;
	chromiumVersion?: string;
	os?: string;
	e2eFilesPath: string;
};
