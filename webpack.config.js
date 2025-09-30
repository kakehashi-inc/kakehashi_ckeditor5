/**
 * @license Copyright (c) 2014-2023, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

'use strict';

/* eslint-env node */

const path = require('path');
const webpack = require('webpack');
const TerserWebpackPlugin = require('terser-webpack-plugin');

module.exports = {
    devtool: 'source-map',
    performance: { hints: false },

    entry: path.resolve(__dirname, 'src', 'ckeditor.js'),

    resolve: {
        alias: {
            '@lang': path.resolve(__dirname, 'lang'),
            '@packages': path.resolve(__dirname, 'packages'),
        },
    },

    output: {
        // The name under which the editor will be exported.
        library: 'ClassicEditor',

        path: path.resolve(__dirname, 'build'),
        filename: 'ckeditor.js',
        libraryTarget: 'umd',
        libraryExport: 'default',
    },

    optimization: {
        minimizer: [
            new TerserWebpackPlugin({
                terserOptions: {
                    sourceMap: true,
                    /*
                    output: {
                        // Preserve CKEditor 5 license comments.
                        comments: /^!/,
                    },
                    */
                },
                //extractComments: false,
                extractComments: true,
            }),
        ],
    },

    plugins: [
        new webpack.BannerPlugin({
            banner: '/*! CKEditor 5 Custom Build - Licensed under GPL-2.0+ */',
            raw: true,
        }),
    ],

    module: {
        rules: [
            {
                test: /\.svg$/,
                use: ['raw-loader'],
            },
            {
                test: /\.css$/,
                use: [
                    {
                        loader: 'style-loader',
                        options: {
                            injectType: 'singletonStyleTag',
                            attributes: {
                                'data-cke': true,
                            },
                        },
                    },
                    {
                        loader: 'css-loader',
                    },
                ],
            },
            {
                test: path.resolve(__dirname, './lang/index.js'),
                loader: path.resolve(__dirname, './src/webpack/lang-loader/json'),
            },
        ],
    },
};
