const { dirname, resolve } = require('path');

(function () {
	const fse = require('fs-extra');

	fse.removeSync('release');

	fse.copySync(
		resolve(
			`${__dirname}\\..\\main\\services\\native\\win32\\native-auth\\build\\Release\\NativeAuth.node`,
		),
		resolve(`${__dirname}\\..\\build\\NativeAuth.node`),
		{ overwrite: true },
	);
	fse.copySync(
		resolve(
			`${__dirname}\\..\\main\\services\\native\\win32\\native-core\\build\\Release\\NativeCore.node`,
		),
		resolve(`${__dirname}\\..\\build\\NativeCore.node`),
		{ overwrite: true },
	);
})();
