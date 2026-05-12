// Tests for /api/cron/* endpoints (Vercel Cron entrypoints).

jest.mock("pg", () => require("../mocks/pg"));
jest.mock("../../src/services/webSocket", () => require("../mocks/webSocket"));
jest.mock("../../src/services/mercadoPago", () => require("../mocks/mercadoPago"));
jest.mock("../../src/services/cloudinary", () => require("../mocks/cloudinary"));

import request from "supertest";
import { buildApp } from "../helpers/buildApp";
import { setupQueryStubs, resetQueryStubs } from "../helpers/queryMock";

const app = buildApp();

const ORIGINAL_SECRET = process.env.CRON_SECRET;

beforeAll(() => {
  process.env.CRON_SECRET = "test-cron-secret";
});

afterAll(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = ORIGINAL_SECRET;
});

describe("/api/cron protection", () => {
  afterEach(() => resetQueryStubs());

  it("returns 401 when no secret is provided", async () => {
    const res = await request(app).post("/api/cron/expired-pre-reserves");
    expect(res.status).toBe(401);
  });

  it("returns 401 with the wrong secret", async () => {
    const res = await request(app)
      .post("/api/cron/expired-pre-reserves")
      .set("Authorization", "Bearer wrong");
    expect(res.status).toBe(401);
  });
});

describe("/api/cron/expired-pre-reserves", () => {
  afterEach(() => resetQueryStubs());

  it("runs the expired pre-reserves job with the correct secret", async () => {
    setupQueryStubs([
      // updateExpiredPreReservesQuery -> no rows
      {
        match: "UPDATE PreRegistration",
        result: { rows: [] },
      },
    ]);

    const res = await request(app)
      .post("/api/cron/expired-pre-reserves")
      .set("Authorization", "Bearer test-cron-secret");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ processed: 0 });
  });
});

describe("/api/cron/check-schedule-status", () => {
  afterEach(() => resetQueryStubs());

  it("calls the schedule-availability update", async () => {
    setupQueryStubs([
      {
        match: "UPDATE ScheduleCourt SET is_available = FALSE",
        result: { rows: [] },
      },
    ]);

    const res = await request(app)
      .post("/api/cron/check-schedule-status")
      .set("Authorization", "Bearer test-cron-secret");
    expect(res.status).toBe(200);
    expect(typeof res.body.data.checkedAt).toBe("string");
  });
});
