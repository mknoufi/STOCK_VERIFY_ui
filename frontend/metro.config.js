// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Fix for Safari: transform import.meta in node_modules for web
// Zustand's devtools uses import.meta.env which Safari doesn't support in non-module scripts
config.transformer = {
  ...config.transformer,
  unstable_allowRequireContext: true,
};

// Ensure node_modules with import.meta are transpiled for web
config.resolver = {
  ...config.resolver,
};

// Add WASM support for expo-sqlite
config.resolver.assetExts.push("wasm");

module.exports = config;
