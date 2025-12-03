/* eslint-env node */
const path = require('path');
const webpack = require('webpack');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Allow deep imports from dependencies without requiring explicit extensions.
  config.resolve = config.resolve || {};
  config.resolve.fullySpecified = false;

  // Add Node.js polyfills for browser compatibility
  config.resolve.fallback = {
    ...config.resolve.fallback,
    fs: false,
    path: false,
    os: false,
    crypto: false,
    stream: false,
    http: false,
    https: false,
    zlib: false,
    url: false,
  };

  // Ensure webpack also applies the rule to module files coming from node_modules.
  config.module = config.module || {};
  config.module.rules = config.module.rules || [];
  config.module.rules.push({
    test: /\.(mjs|cjs|js)$/,
    resolve: {
      fullySpecified: false,
    },
  });

  // Suppress critical dependency warnings for require.context
  config.module.exprContextCritical = false;
  config.module.unknownContextCritical = false;

  // Map the legacy export path to the CommonJS build so navigation packages keep working across SDK upgrades.
  config.resolve.alias = config.resolve.alias || {};
  const cwd = process.cwd();
  config.resolve.alias['react-native-web/dist/exports/'] = path.resolve(
    cwd,
    'node_modules/react-native-web/dist/cjs/exports/'
  );
  config.resolve.alias['react-native-web/dist/exports'] = path.resolve(
    cwd,
    'node_modules/react-native-web/dist/cjs/exports'
  );
  config.resolve.alias['@react-native-async-storage/async-storage'] = path.resolve(
    cwd,
    'node_modules/@react-native-async-storage/async-storage/lib/commonjs/index.js'
  );

  const isDevelopment = config.mode === 'development';
  if (isDevelopment) {
    const refreshPolyfillPath = path.resolve(cwd, 'refreshPolyfill.js');

    config.plugins = config.plugins || [];

    // Add DefinePlugin to suppress warnings
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(config.mode || 'development'),
      })
    );

    const hasReactRefreshPlugin = config.plugins.some(
      (plugin) => plugin?.constructor?.name === 'ReactRefreshWebpackPlugin'
    );
    if (!hasReactRefreshPlugin) {
      config.plugins.push(
        new ReactRefreshWebpackPlugin({
          overlay: false, // Disable error overlay for cleaner experience
        })
      );
    }

    config.plugins.push(
      new webpack.ProvidePlugin({
        $RefreshReg$: [refreshPolyfillPath, 'register'],
        $RefreshSig$: [refreshPolyfillPath, 'signature'],
      })
    );

    if (Array.isArray(config.entry)) {
      if (!config.entry.includes(refreshPolyfillPath)) {
        config.entry = [refreshPolyfillPath, ...config.entry];
      }
    } else if (typeof config.entry === 'string') {
      config.entry = [refreshPolyfillPath, config.entry];
    } else if (config.entry && typeof config.entry === 'object') {
      Object.keys(config.entry).forEach((key) => {
        const entryValue = config.entry[key];
        if (Array.isArray(entryValue) && !entryValue.includes(refreshPolyfillPath)) {
          config.entry[key] = [refreshPolyfillPath, ...entryValue];
        } else if (typeof entryValue === 'string') {
          config.entry[key] = [refreshPolyfillPath, entryValue];
        }
      });
    } else if (!config.entry) {
      config.entry = [refreshPolyfillPath];
    }
  }

  // Optimization settings to reduce bundle warnings
  config.optimization = config.optimization || {};
  config.optimization.moduleIds = 'deterministic';
  config.optimization.runtimeChunk = 'single';

  // Ignore specific warnings
  config.ignoreWarnings = [
    /Critical dependency: require function is used in a way/,
    /Critical dependency: the request of a dependency is an expression/,
  ];

  // Performance hints
  config.performance = {
    ...config.performance,
    hints: false, // Disable performance hints for development
  };

  return config;
};
