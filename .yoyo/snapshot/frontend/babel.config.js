module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Transform import.meta for web compatibility
      // This must come before other plugins
      /*
      [
        'babel-plugin-transform-import-meta',
        {
          module: 'ES6',
        },
      ],
      */
      // Removed react-native-dotenv - it conflicts with expo-router
      // Use EXPO_PUBLIC_* environment variables instead (built into Expo)
      // Reanimated plugin must be listed last
      'react-native-reanimated/plugin',
    ],
  };
};
