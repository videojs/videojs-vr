const pkg = require('../package.json');
const bannerString = [
  `@name ${pkg.name}`,
  `@version ${pkg.version}`,
  `@license ${pkg.license}`
].join(' ');

module.exports = {
  string: bannerString,
  comment: `/*! ${bannerString} */`
};
