module.exports = {
  extends: 'expo',
  ignorePatterns: ['/dist/*', '/node_modules/*', '/android/*', '/ios/*'],
  rules: {
    // Allow underscore prefix for intentionally unused variables
    '@typescript-eslint/no-unused-vars': ['warn', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
    }],
  },
};
