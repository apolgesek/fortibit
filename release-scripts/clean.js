(function() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fse = require('fs-extra');

  fse.removeSync('release');
})();
