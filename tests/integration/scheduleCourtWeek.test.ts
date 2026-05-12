jest.mock("pg", () => require("../mocks/pg"));
jest.mock("../../src/services/webSocket", () => require("../mocks/webSocket"));
jest.mock("../../src/services/mercadoPago", () => require("../mocks/mercadoPago"));
jest.mock("../../src/services/cloudinary", () => require("../mocks/cloudinary"));

import request from "supertest";
import { buildApp } from "../helpers/buildApp";
import { setupQueryStubs, resetQueryStubs } from "../helpers/queryMock";
import { bearer } from "../helpers/auth";

const app = buildApp();

describe("ScheduleCourtWeek router", () => {
  afterEach(() => resetQueryStubs());

  it("GET /api/schedulecourtweek requires admin", async () => {
    const res = await request(app)
      .get("/api/schedulecourtweek")
      .set("Authorization", bearer("1", "user"));
    expect(res.status).toBe(403);
  });

  it("GET /api/schedulecourtweek returns the list for an admin", async () => {
    setupQueryStubs([
      {
        match: "FROM WeekScheduleCourt ORDER BY",
        result: { rows: [{ id: "1", day_of_week: 1 }] },
      },
    ]);
    const res = await request(app)
      .get("/api/schedulecourtweek")
      .set("Authorization", bearer("1", "admin"));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it("POST /api/schedulecourtweek validates inputs", async () => {
    const res = await request(app)
      .post("/api/schedulecourtweek")
      .set("Authorization", bearer("1", "admin"))
      .send({});
    expect(res.status).toBe(400);
  });

  it("POST /api/schedulecourtweek rejects start_time >= end_time", async () => {
    setupQueryStubs([
      {
        // overlappingSchedulesQuery
        match: "FROM WeekScheduleCourt",
        result: { rows: [] },
      },
    ]);

    const res = await request(app)
      .post("/api/schedulecourtweek")
      .set("Authorization", bearer("1", "admin"))
      .send({
        court_id: "1",
        day_of_week: 1,
        start_time: "12:00",
        end_time: "10:00",
        hourprice: 800,
        halfprice: 1100,
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Start time must be before end time/);
  });

  it("POST /api/schedulecourtweek rejects overlapping schedules", async () => {
    setupQueryStubs([
      {
        match: "FROM WeekScheduleCourt",
        result: { rows: [{ id: "1" }] },
      },
    ]);

    const res = await request(app)
      .post("/api/schedulecourtweek")
      .set("Authorization", bearer("1", "admin"))
      .send({
        court_id: "1",
        day_of_week: 1,
        start_time: "10:00",
        end_time: "11:00",
        hourprice: 800,
        halfprice: 1100,
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/overlaps/);
  });
});
