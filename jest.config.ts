import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  moduleFileExtensions: ["ts", "js", "json"],
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.ts$": ["ts-jest", { isolatedModules: true }],
  },

  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },

  clearMocks: true,
  verbose: true,
};

export default config;
