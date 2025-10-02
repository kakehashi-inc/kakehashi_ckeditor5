module.exports = {
    plugins: [
        require('postcss-preset-env')({
            stage: 3,
            features: { 'nesting-rules': true },
            autoprefixer: { grid: true }, // IE11等が必要なら true または 'autoplace'
        }),
    ],
};
