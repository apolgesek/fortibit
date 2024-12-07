const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	rootDir: '.',
	moduleNameMapper: {
		...pathsToModuleNameMapper(compilerOptions.paths, {
			prefix: '<rootDir>/',
		}),
	},
	modulePathIgnorePatterns: ['out-tsc', 'release'],
	testMatch: ['<rootDir>/__tests__/**/*.test.ts'],
};
