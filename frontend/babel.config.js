module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // Transform import.meta for web compatibility - MUST be first
      // This transforms import.meta.env to process.env for Safari compatibility
      [
        "babel-plugin-transform-import-meta",
        {
          // Replaces import.meta with a module-level object
        },
      ],
      // NOTE: module-resolver plugin is temporarily disabled to avoid
      // a bundling-time dependency on babel-plugin-module-resolver.
      // If you need '@/...' aliases again, re-enable the plugin and
      // ensure the Babel plugin can be resolved in this environment.
      // Reanimated plugin includes worklets support and must be listed last
      "react-native-reanimated/plugin",
    ],
  };
};
