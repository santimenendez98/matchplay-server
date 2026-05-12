// Coverage for the endpoints added to the router as part of this branch.

jest.mock("pg", () => require("../mocks/pg"));
jest.mock("../../src/services/webSocket", () => require("../mocks/webSocket"));
jest.mock("../../src/services/mercadoPago", () => require("../mocks/mercadoPago"));
jest.mock("../../src/services/cloudinary", () => require("../mocks/cloudinary"));

import request from "supertest";
import { buildApp } from "../helpers/buildApp";
import { setupQueryStubs, resetQueryStubs } from "../helpers/queryMock";
import { bearer } from "../helpers/auth";

const app = buildApp();

describe("New endpoints", () => {
  afterEach(() => resetQueryStubs());

  describe("GET /api/health", () => {
    it("returns ok without auth", async () => {
      const res = await request(app).get("/api/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
      expect(typeof res.body.uptime).toBe("number");
    });
  });

  describe("GET /api/reservation/:id", () => {
    it("requires auth", async () => {
      const res = await request(app).get("/api/reservation/1");
      expect(res.status).toBe(401);
    });

    it("returns 404 when the reservation is missing", async () => {
      setupQueryStubs([
        { match: "FROM Reservation WHERE id", result: { rows: [] } },
      ]);
      const res = await request(app)
        .get("/api/reservation/99")
        .set("Authorization", bearer("1", "user"));
      expect(res.status).toBe(404);
    });

    it("returns the reservation to its owner", async () => {
      setupQueryStubs([
        {
          match: "FROM Reservation WHERE id",
          result: {
            rows: [
              {
                id: "1",
                status: "pending",
                account_id: "7",
                is_match: false,
              },
            ],
          },
        },
      ]);
      const res = await request(app)
        .get("/api/reservation/1")
        .set("Authorization", bearer("7", "user"));
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ id: "1" });
    });

    it("rejects another user from reading someone's reservation", async () => {
      setupQueryStubs([
        {
          match: "FROM Reservation WHERE id",
          result: {
            rows: [
              {
                id: "1",
                status: "pending",
                account_id: "7",
                is_match: false,
              },
            ],
          },
        },
      ]);
      const res = await request(app)
        .get("/api/reservation/1")
        .set("Authorization", bearer("9", "user"));
      expect(res.status).toBe(403);
    });

    it("admin can read any reservation", async () => {
      setupQueryStubs([
        {
          match: "FROM Reservation WHERE id",
          result: {
            rows: [{ id: "1", account_id: "7", is_match: false }],
          },
        },
      ]);
      const res = await request(app)
        .get("/api/reservation/1")
        .set("Authorization", bearer("99", "admin"));
      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/reservation/account/me", () => {
    it("returns the caller's reservations", async () => {
      setupQueryStubs([
        {
          match: /FROM Reservation\s+WHERE account_id/,
          result: {
            rows: [
              { id: "1", account_id: "7" },
              { id: "2", account_id: "7" },
            ],
          },
        },
      ]);
      const res = await request(app)
        .get("/api/reservation/account/me")
        .set("Authorization", bearer("7", "user"));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });
  });

  describe("GET /api/reservation/ (admin-only)", () => {
    it("rejects a user (now admin/creator only)", async () => {
      const res = await request(app)
        .get("/api/reservation")
        .set("Authorization", bearer("1", "user"));
      expect(res.status).toBe(403);
    });

    it("allows admin", async () => {
      setupQueryStubs([
        { match: "FROM Reservation", result: { rows: [] } },
      ]);
      const res = await request(app)
        .get("/api/reservation")
        .set("Authorization", bearer("1", "admin"));
      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/match/:id and /:id/players", () => {
    it("returns 404 when match is missing", async () => {
      setupQueryStubs([
        { match: "FROM Match WHERE id", result: { rows: [] } },
      ]);
      const res = await request(app)
        .get("/api/match/99")
        .set("Authorization", bearer("1", "user"));
      expect(res.status).toBe(404);
    });

    it("returns the match", async () => {
      setupQueryStubs([
        {
          match: "FROM Match WHERE id",
          result: { rows: [{ id: "1", status: "pending" }] },
        },
      ]);
      const res = await request(app)
        .get("/api/match/1")
        .set("Authorization", bearer("1", "user"));
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ id: "1" });
    });

    it("returns the joined players", async () => {
      setupQueryStubs([
        {
          match: "FROM MatchPlayer",
          result: { rows: [{ match_id: "1", player_id: "7" }] },
        },
      ]);
      const res = await request(app)
        .get("/api/match/1/players")
        .set("Authorization", bearer("1", "user"));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe("GET /api/match/player/me", () => {
    it("returns matches the user has joined", async () => {
      setupQueryStubs([
        {
          match: "FROM Match m",
          result: { rows: [{ id: "1" }] },
        },
      ]);
      const res = await request(app)
        .get("/api/match/player/me")
        .set("Authorization", bearer("7", "user"));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe("GET /api/payment (list all)", () => {
    it("rejects regular users", async () => {
      const res = await request(app)
        .get("/api/payment")
        .set("Authorization", bearer("1", "user"));
      expect(res.status).toBe(403);
    });

    it("requires auth", async () => {
      const res = await request(app).get("/api/payment");
      expect(res.status).toBe(401);
    });

    it("returns all payments for an admin", async () => {
      setupQueryStubs([
        {
          match: "FROM Payment ORDER BY payment_date DESC",
          result: { rows: [{ id: "1" }, { id: "2" }] },
        },
      ]);
      const res = await request(app)
        .get("/api/payment")
        .set("Authorization", bearer("1", "admin"));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    it("returns all payments for a creator", async () => {
      setupQueryStubs([
        {
          match: "FROM Payment ORDER BY payment_date DESC",
          result: { rows: [] },
        },
      ]);
      const res = await request(app)
        .get("/api/payment")
        .set("Authorization", bearer("1", "creator"));
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });

  describe("GET /api/payment/:id", () => {
    it("rejects regular users", async () => {
      const res = await request(app)
        .get("/api/payment/1")
        .set("Authorization", bearer("1", "user"));
      expect(res.status).toBe(403);
    });

    it("returns 404 when payment is missing", async () => {
      setupQueryStubs([
        { match: "FROM Payment WHERE id", result: { rows: [] } },
      ]);
      const res = await request(app)
        .get("/api/payment/999")
        .set("Authorization", bearer("1", "admin"));
      expect(res.status).toBe(404);
    });

    it("returns the payment", async () => {
      setupQueryStubs([
        {
          match: "FROM Payment WHERE id",
          result: { rows: [{ id: "1", payment_status: "completed" }] },
        },
      ]);
      const res = await request(app)
        .get("/api/payment/1")
        .set("Authorization", bearer("1", "admin"));
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ id: "1" });
    });
  });

  describe("GET /api/payment/account/me", () => {
    it("returns the user's payments", async () => {
      setupQueryStubs([
        {
          match: "FROM Payment WHERE user_id",
          result: { rows: [{ id: "1" }] },
        },
      ]);
      const res = await request(app)
        .get("/api/payment/account/me")
        .set("Authorization", bearer("7", "user"));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe("GET /api/payment/reservation/:id", () => {
    it("rejects a regular user", async () => {
      const res = await request(app)
        .get("/api/payment/reservation/1")
        .set("Authorization", bearer("7", "user"));
      expect(res.status).toBe(403);
    });

    it("returns payments for an admin", async () => {
      setupQueryStubs([
        {
          match: "FROM Payment WHERE reservation_id",
          result: { rows: [{ id: "1" }] },
        },
      ]);
      const res = await request(app)
        .get("/api/payment/reservation/1")
        .set("Authorization", bearer("7", "admin"));
      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/scheduleday/court/:courtId", () => {
    it("requires the `date` query parameter", async () => {
      const res = await request(app).get("/api/scheduleday/court/1");
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/date/);
    });

    it("returns slots for a court on a given date", async () => {
      setupQueryStubs([
        {
          match: "WHERE court_id = $1 AND schedule_date = $2",
          result: { rows: [{ id: "1", start_time: "10:00" }] },
        },
      ]);
      const res = await request(app).get(
        "/api/scheduleday/court/1?date=2030-01-01"
      );
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe("GET /api/match/message/history/:id (now open to players)", () => {
    it("allows a regular user to read chat history", async () => {
      setupQueryStubs([
        {
          match: "FROM MessageMatch",
          result: { rows: [] },
        },
      ]);
      const res = await request(app)
        .get("/api/match/message/history/1")
        .set("Authorization", bearer("7", "user"));
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });
});
