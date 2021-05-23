// eslint-disable-next-line
const fse = require('fs-extra');

const srcDir = 'release/win-unpacked';
const destDir = 'release/sub';

if (!fse.existsSync(destDir)) {
  fse.mkdirSync(destDir);
}

fse.copySync(srcDir, destDir, { recursive: true, overwrite: true, filter: (src) => !src.endsWith('fortibit.exe')});
