/* eslint-disable @typescript-eslint/no-var-requires */

(function() {
  const fse = require('fs-extra');

  const product = require('../product.json');
  product.commit = require('child_process').execSync('git rev-parse HEAD').toString().trim();

  const productJson = JSON.stringify(product);
  fse.writeFileSync('../product.json', productJson, { encoding: 'utf-8' });
})();