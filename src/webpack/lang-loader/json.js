var path = require('path');
const loaderUtils = require('loader-utils');
const jsonLoader = require('./json-loader');

module.exports = function (indexContent) {
    let baseDirectory = path.dirname(this.resource);

    let options = {};
    try {
        options = loaderUtils.getOptions(this);
    } catch (e) {}

    const info = new URL('file://' + this.resource);
    info.searchParams.forEach((value, key) => {
        options[key] = value;
    });

    this.addDependency(baseDirectory);

    return 'module.exports = ' + JSON.stringify(
        jsonLoader.execute(baseDirectory, options, this)
    );
};
