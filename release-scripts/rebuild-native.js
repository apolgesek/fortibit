/* before running this script for the first time run "npm config edit" command and check
	"msvs_version" and "python" directory configs
	for python 3.12 onwards it may be required to run pip install setuptools command
	
	use --verbose argument and detached: true spawn option to get detailed logs including errors
*/

const { spawn } = require('child_process');
const { resolve } = require('path');

var argv = require('minimist')(process.argv.slice(2));

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
				stdio: ['ignore', 'pipe', 'pipe'],
			},
		);

		let infoOutput = '';
		let errorOutput = '';

		process.stdout.on('data', (data) => {
			infoOutput += data.toString();
		});

		if (argv.verbose) {
			process.stderr.on('data', (data) => {
				errorOutput += data.toString();
			});
		}

		process.on('error', function (error) {
			console.error(error);
		});

		process.on('exit', () => {
			if (errorOutput) {
				console.error('\x1b[31m', errorOutput, '\x1b[0m');
			}

			console.log(infoOutput);
		});
	});
})();
