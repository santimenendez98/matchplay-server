jest.mock("pg", () => require("../mocks/pg"));
jest.mock("../../src/services/webSocket", () => require("../mocks/webSocket"));
jest.mock("../../src/services/mercadoPago", () => require("../mocks/mercadoPago"));
jest.mock("../../src/services/cloudinary", () => require("../mocks/cloudinary"));

import request from "supertest";
import { buildApp } from "../helpers/buildApp";
import { setupQueryStubs, resetQueryStubs } from "../helpers/queryMock";
import { bearer } from "../helpers/auth";

const app = buildApp();

describe("ScheduleDay router", () => {
  afterEach(() => resetQueryStubs());

  describe("GET /api/scheduleday", () => {
    it("returns the list (route is public)", async () => {
      setupQueryStubs([
        {
          match: "FROM ScheduleCourt ORDER BY",
          result: { rows: [{ id: "1", start_time: "10:00" }] },
        },
      ]);
      const res = await request(app).get("/api/scheduleday");
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe("GET /api/scheduleday/price", () => {
    it("returns 401 when no token", async () => {
      const res = await request(app).get("/api/scheduleday/price");
      expect(res.status).toBe(401);
    });

    it("returns the day-price list", async () => {
      setupQueryStubs([
        {
          match: "FROM ScheduleCourtPrice",
          result: { rows: [{ id: "1", hourprice: 800, halfprice: 1100 }] },
        },
      ]);
      const res = await request(app)
        .get("/api/scheduleday/price")
        .set("Authorization", bearer("1", "user"));
      expect(res.status).toBe(200);
    });
  });

  describe("POST /api/scheduleday/price", () => {
    it("is forbidden for non-admin", async () => {
      const res = await request(app)
        .post("/api/scheduleday/price")
        .set("Authorization", bearer("1", "user"))
        .send({ schedule_id: "1", hourprice: 800, halfprice: 1100 });
      expect(res.status).toBe(403);
    });

    it("creates a day-price for an admin", async () => {
      setupQueryStubs([
        {
          match: "INSERT INTO ScheduleCourtPrice",
          result: {
            rows: [{ id: "1", schedule_id: "1", hourprice: 800, halfprice: 1100 }],
          },
        },
      ]);
      const res = await request(app)
        .post("/api/scheduleday/price")
        .set("Authorization", bearer("1", "admin"))
        .send({ schedule_id: "1", hourprice: 800, halfprice: 1100 });
      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ hourprice: 800 });
    });
  });
});
