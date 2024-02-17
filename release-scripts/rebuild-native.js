const { spawn } = require('child_process');
const { resolve } = require('path');

(function () {
	const nativeDir = __dirname + '/../main/services/native/win32/';
	const packageObj = require('../package.json');
	const nativeModules = ['native-auth', 'native-core'];

	nativeModules.forEach((m) => {
		const process = spawn(
			`node-gyp rebuild --target=${packageObj.devDependencies.electron} --arch=x64 --dist-url=https://electronjs.org/headers`,
			{
				cwd: resolve(nativeDir + m),
				shell: true,
				stdio: ['ignore', 'pipe', 'ignore'],
			},
		);

		let output = '';
		process.stdout.on('data', (data) => {
			output += data.toString();
		});

		process.on('error', function (error) {
			console.error(error);
		});

		process.on('exit', () => {
			console.log(output);
		});
	});
})();
