module.exports = {
    rootDir: '.',
    preset: 'react-native',
    transform: {
        '^.+\\.[tj]sx?$': 'babel-jest',
    },
    // Allow these packages in node_modules to be transformed by Babel
    transformIgnorePatterns: [
        "node_modules/(?!(jest-)?react-native|@?react-navigation|expo|@expo|@unimodules|@react-native|@react-native-community|@sentry|@react-native-async-storage|@gorhom|@unimodules/.*)/"
    ],
    setupFilesAfterEnv: [
        "<rootDir>/jest.setup.js",
        "@testing-library/jest-native/extend-expect"
    ],
    moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '^@/(.*)$': '<rootDir>/src/$1'
    },
    testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '<rootDir>/app/test.tsx'
    ],
    testMatch: [
        "**/__tests__/**/*.[jt]s?(x)",
        "**/?(*.)+(spec|test).[jt]s?(x)"
    ],
    testTimeout: 10000
};
