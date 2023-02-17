let fs = require('fs');
let path = require('path');

const jsonLoader = {
    execute(baseDirectory, options, loader) {
        let bundle = {};

        const targets = [];
        if (options && typeof options.targets !== 'undefined') {
            options.targets.split(',').forEach(value => {
                targets.push(value.trim());
            });
        }

        const langs = [];
        fs.readdirSync(baseDirectory, { withFileTypes: true }).forEach(dirent => {
            if (dirent.isDirectory() && !dirent.name.startsWith('.')) {
                langs.push(dirent.name);
            }
        });

        langs.forEach(lang => {
            const files = fs.readdirSync(baseDirectory + path.sep + lang).filter(file => {
                return path.extname(file) === '.json';
            });

            files.forEach(file => {
                const filename = path.basename(file, '.json');
                if (targets.length == 0 || targets.indexOf(filename) >= 0) {
                    const filePath = path.join(baseDirectory, lang, file);
                    loader.addDependency(filePath);

                    const content = fs.readFileSync(filePath);

                    if (typeof bundle[lang] === 'undefined') {
                        bundle[lang] = {};
                    }
                    bundle[lang][filename] = JSON.parse(content);
                }
            });
        });

        return bundle;
    },
};

module.exports = jsonLoader;
