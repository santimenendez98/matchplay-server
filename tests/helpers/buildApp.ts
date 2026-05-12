// Build a minimal Express app that mounts only the API router (no socket.io, no cron jobs).
// Tests can call `buildApp()` after configuring jest module mocks.

import express, { Express } from "express";

export const buildApp = (): Express => {
  const app = express();
  app.use(express.json());
  // require lazily so that any jest.mock() defined in the test file takes effect first
  const router = require("../../src/routes").default;
  app.use("/api", router);
  return app;
};
