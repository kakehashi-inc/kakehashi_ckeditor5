/**
 * ESLint 9 (flat config) for this project.
 *
 * Uses the official CKEditor 5 ESLint preset (`eslint-config-ckeditor5`), as
 * recommended in its README. The preset relies on `typescript-eslint`, so
 * `typescript` is installed as a dev dependency (lint-time only).
 *
 * Formatting is owned by Prettier, not ESLint. `eslint-config-prettier` is applied
 * last to turn off every stylistic rule from the CKEditor preset that would conflict
 * with Prettier (indentation, spacing, commas, etc.). ESLint then only reports
 * quality/bug rules (unused vars, CKEditor import rules, etc.).
 */
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import ckeditor5Config from 'eslint-config-ckeditor5';
import ckeditor5Rules from 'eslint-plugin-ckeditor5-rules';
import prettierConfig from 'eslint-config-prettier/flat';

// The official preset references `ckeditor5-rules/*` rules in some config objects
// without registering the `ckeditor5-rules` plugin in that same object. ESLint 9's
// strict validation rejects that. Ensure every preset config object that has its own
// `rules` also has the `ckeditor5-rules` plugin available.
const patchedCkeditor5Config = ckeditor5Config.map(config => {
    if (!config.rules) {
        return config;
    }

    return {
        ...config,
        plugins: {
            'ckeditor5-rules': ckeditor5Rules,
            ...config.plugins,
        },
    };
});

export default defineConfig([
    // Ignore generated output, dependencies, samples and vendored code.
    globalIgnores([
        'build/**',
        'node_modules/**',
        'sample/**',
        'sample-code/**',
        // Vendored third-party color picker (not our code).
        'packages/font-color/src/ui/jscolor.js',
    ]),

    // Official CKEditor 5 preset (array of flat-config objects), patched for ESLint 9.
    ...patchedCkeditor5Config,

    // Disable all stylistic rules that conflict with Prettier. Must come last
    // (before our project-specific overrides below).
    prettierConfig,

    // Project-specific settings: this is browser-targeted UI code.
    {
        files: ['packages/**/*.{js,mjs,cjs}', 'src/**/*.{js,mjs,cjs}'],
        languageOptions: {
            globals: {
                ...globals.browser,
            },
        },
        rules: {
            // Formatting is owned by Prettier; comment spacing is not a quality concern.
            '@stylistic/spaced-comment': 'off',
        },
    },
]);
