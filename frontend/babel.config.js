module.exports = function (api) {
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
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            // Map '@/...' to the frontend src directory so imports like
            // '@/theme/Provider' resolve to 'frontend/src/theme/Provider.tsx'
            '@': './src',
          },
          extensions: [
            '.ios.ts',
            '.android.ts',
            '.ts',
            '.ios.tsx',
            '.android.tsx',
            '.tsx',
            '.jsx',
            '.js',
            '.json',
            '.web.ts',
            '.web.tsx',
            '.web.js',
          ],
        },
      ],
      // Reanimated plugin includes worklets support and must be listed last
      'react-native-reanimated/plugin',
    ],
  };
};
