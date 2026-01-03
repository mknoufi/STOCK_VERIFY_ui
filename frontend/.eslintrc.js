module.exports = {
  extends: "expo",
  ignorePatterns: ["/dist/*", "/node_modules/*", "/android/*", "/ios/*"],
  rules: {
    // Allow underscore prefix for intentionally unused variables
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
    // Disable false positive for string comparisons in JSX expressions
    "react-native/no-raw-text": "off",
  },
  settings: {
    "import/resolver": {
      typescript: {
        alwaysTryTypes: true,
        project: "./tsconfig.json",
      },
      node: {
        extensions: [".js", ".jsx", ".ts", ".tsx"],
      },
    },
  },
};
