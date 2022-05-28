/* eslint-disable @typescript-eslint/no-var-requires */

// RUN IN MAIN PROJECT DIRECTORY

(function() {
  const fse = require('fs-extra');

  const srcDir = 'release/win-unpacked';
  const destDir = 'release/sub';

  if (!fse.existsSync(destDir)) {
    fse.mkdirSync(destDir);
  }

  fse.copySync(srcDir, destDir, { recursive: true, overwrite: true, filter: (src) => !src.endsWith('fortibit.exe')});
  const props = require('../product.json');
  props.commit = require('child_process').execSync('git rev-parse HEAD').toString().trim();
  const productJson = JSON.stringify(props);
  fse.writeFileSync('../product.json', productJson, { encoding: 'utf-8' });
})();