var path = require('path');

module.exports = {
    entry: './src/handler.ts',
    target: 'node',
    module: {
        loaders: [
            { test: /\.json$/, loader: 'json-loader' },
            { test: /\.tsx?$/, loader: "awesome-typescript-loader" },
            { enforce: "pre", test: /\.js$/, loader: "source-map-loader" }
        ]
    },
    resolve: {
        extensions: ['.ts', '.js', '.tsx', '.jsx']
    },
    output: {
        libraryTarget: 'commonjs',
        path: path.join(__dirname, 'target'),
        filename: 'handler.js'
    }
};
