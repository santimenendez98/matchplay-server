/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  testMatch: ["**/?(*.)+(spec|test).[jt]s"],
  moduleFileExtensions: ["ts", "js", "json"],
  setupFiles: ["<rootDir>/tests/setupEnv.ts"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/index.ts",
    "!src/db/connection.ts",
    "!src/cronjobs/**",
  ],
  coverageDirectory: "coverage",
  clearMocks: true,
  resetMocks: false,
  restoreMocks: false,
  verbose: true,
  testTimeout: 15000,
};
