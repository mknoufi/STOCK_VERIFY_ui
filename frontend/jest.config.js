/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.polyfills.js", "<rootDir>/jest.setup.js"],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/e2e/",
    "/playwright-report/",
    "/test-results/",
  ],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|expo-router|expo-.*)",
  ],
};
