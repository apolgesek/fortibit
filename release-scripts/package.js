/* eslint-disable @typescript-eslint/no-var-requires */

(function() {
  const fse = require('fs-extra');

  const props = require('../product.json');
  props.commit = require('child_process').execSync('git rev-parse HEAD').toString().trim();

  const productJson = JSON.stringify(props);
  fse.writeFileSync('../product.json', productJson, { encoding: 'utf-8' });
})();