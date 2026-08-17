const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const webpack = require('webpack');
const glob = require('glob');
const CopyPlugin = require('copy-webpack-plugin');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');

const themeEntries = glob.sync(`${path.resolve(__dirname, 'src/themes')}/*.css`).reduce((acc, filePath) => {
    const themeName = path.basename(filePath, '.css');
    acc[`themes/${themeName}`] = path.resolve(__dirname, `src/themes/${themeName}.css`);
    return acc;
}, {});

const resolveAlias = {
    '@': path.resolve(__dirname, 'src'),
    '@pages': path.resolve(__dirname, 'src/pages'),
    '@modules': path.resolve(__dirname, 'src/modules'),
    '@utilities': path.resolve(__dirname, 'src/modules/utilities'),
    '@validation': path.resolve(__dirname, 'src/modules/validation'),
    '@themes': path.resolve(__dirname, 'src/themes'),
    '@styles': path.resolve(__dirname, 'src/css'),
    '@images': path.resolve(__dirname, 'src/images'),
};

const babelRule = {
    test: /\.js$/,
    exclude: /node_modules/,
    use: {
        loader: 'babel-loader',
        options: {
            presets: ['@babel/preset-env']
        }
    }
};

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production';

    const webConfig = {
        entry: {
            main: path.resolve(__dirname, 'src/main.js'),
            ...themeEntries
        },
        resolve: {
            alias: resolveAlias
        },
        output: {
            path: path.resolve(__dirname, 'wwwroot/dist'),
            filename: isProduction ? '[name].[contenthash:8].js' : '[name].js',
            publicPath: '/_content/Memtly.Core/dist/',
            clean: {
                keep: /fonts\/|images\/|service-worker\.js/
            }
        },
        module: {
            rules: [
                babelRule,
                {
                    test: /\.css$/,
                    use: [
                        MiniCssExtractPlugin.loader,
                        'css-loader'
                    ]
                },
                {
                    test: /\.(woff|woff2|eot|ttf|otf)$/,
                    type: 'asset/resource',
                    generator: {
                        filename: 'fonts/[name][ext]'
                    }
                },
                {
                    test: /\.(svg|png|jpg|jpeg|gif)$/,
                    type: 'asset/resource',
                    generator: {
                        filename: 'images/[name][ext]'
                    }
                }
            ]
        },
        plugins: [
            new MiniCssExtractPlugin({
                filename: isProduction ? '[name].[contenthash:8].css' : '[name].css'
            }),
            new webpack.ProvidePlugin({
                $: 'jquery',
                jQuery: 'jquery',
                'window.jQuery': 'jquery',
                Popper: ['@popperjs/core', 'default']
            }),
            new CopyPlugin({
                patterns: [
                    {
                        from: 'node_modules/@fortawesome/fontawesome-free/webfonts',
                        to: 'fonts'
                    }
                ]
            }),
            new WebpackManifestPlugin({
                fileName: 'manifest.json',
                publicPath: '/_content/Memtly.Core/dist/'
            })
        ],
        optimization: {
            runtimeChunk: 'single'
        }
    };

    // Service worker must ship as a single, unbundled script with a stable
    // filename (no contenthash) so it can be registered from a fixed URL and
    // byte-diffed by the browser. It intentionally has no WebpackManifestPlugin
    // instance - two independent compilers writing manifest.json to the same
    // output dir would race and clobber each other, breaking WebpackHelper's
    // asset lookups for main.js/main.css.
    const swConfig = {
        entry: {
            'service-worker': path.resolve(__dirname, 'src/service-worker.js')
        },
        target: 'webworker',
        resolve: {
            alias: resolveAlias
        },
        output: {
            path: path.resolve(__dirname, 'wwwroot/dist'),
            filename: '[name].js'
        },
        module: {
            rules: [babelRule]
        }
    };

    return [webConfig, swConfig];
};