jest.mock("pg", () => require("../mocks/pg"));
jest.mock("../../src/services/webSocket", () => require("../mocks/webSocket"));
jest.mock("../../src/services/mercadoPago", () => require("../mocks/mercadoPago"));
jest.mock("../../src/services/cloudinary", () => require("../mocks/cloudinary"));

import request from "supertest";
import { buildApp } from "../helpers/buildApp";
import { setupQueryStubs, resetQueryStubs } from "../helpers/queryMock";
import { bearer } from "../helpers/auth";

const app = buildApp();

describe("Reservation router", () => {
  afterEach(() => resetQueryStubs());

  describe("GET /api/reservation", () => {
    it("requires auth", async () => {
      const res = await request(app).get("/api/reservation");
      expect(res.status).toBe(401);
    });

    it("rejects a regular user (now admin/creator only)", async () => {
      const res = await request(app)
        .get("/api/reservation")
        .set("Authorization", bearer("1", "user"));
      expect(res.status).toBe(403);
    });

    it("returns all reservations for an admin", async () => {
      setupQueryStubs([
        { match: "FROM Reservation", result: { rows: [{ id: "1" }] } },
      ]);
      const res = await request(app)
        .get("/api/reservation")
        .set("Authorization", bearer("1", "admin"));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe("POST /api/reservation", () => {
    it("rejects missing fields", async () => {
      const res = await request(app)
        .post("/api/reservation")
        .set("Authorization", bearer("1", "user"))
        .send({});
      expect(res.status).toBe(400);
    });

    it("returns 404 when account does not exist", async () => {
      setupQueryStubs([
        // getScheduleById - returns a slot
        {
          match: "FROM ScheduleCourt WHERE id",
          result: {
            rows: [
              {
                id: "10",
                court_id: "5",
                schedule_date: "2030-01-01",
                start_time: "10:00",
                end_time: "10:30",
              },
            ],
          },
        },
        // checkReservationExistsQuery - account has no active reservation
        {
          match: "FROM Reservation WHERE account_id",
          result: { rows: [] },
        },
        // getAccountByIdQuery - empty
        { match: "FROM Account WHERE id", result: { rows: [] } },
      ]);

      const res = await request(app)
        .post("/api/reservation")
        .set("Authorization", bearer("1", "user"))
        .send({
          schedule_id: "10",
          account_id: "1",
          time_reserved: 1,
          is_match: false,
        });
      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Account not found");
    });

    it("returns 400 when no slots are available for the requested time", async () => {
      setupQueryStubs([
        {
          match: "FROM ScheduleCourt WHERE id",
          result: {
            rows: [
              {
                id: "10",
                court_id: "5",
                schedule_date: "2030-01-01",
                start_time: "10:00",
                end_time: "10:30",
              },
            ],
          },
        },
        { match: "FROM Reservation WHERE account_id", result: { rows: [] } },
        {
          match: "FROM Account WHERE id",
          result: { rows: [{ id: "1" }] },
        },
        // verifyHourAvailabilityQuery - returns fewer than 2 (1 hour needs 2 slots)
        {
          match: "is_available = TRUE AND start_time",
          result: { rows: [{ id: "10" }] },
        },
      ]);

      const res = await request(app)
        .post("/api/reservation")
        .set("Authorization", bearer("1", "user"))
        .send({
          schedule_id: "10",
          account_id: "1",
          time_reserved: 1,
          is_match: false,
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/No available slots/i);
    });

    it("returns 400 when the player already has an active reservation", async () => {
      setupQueryStubs([
        {
          match: "FROM ScheduleCourt WHERE id",
          result: {
            rows: [
              {
                id: "10",
                court_id: "5",
                schedule_date: "2030-01-01",
                start_time: "10:00",
                end_time: "10:30",
              },
            ],
          },
        },
        // existing active reservation
        {
          match: "FROM Reservation WHERE account_id",
          result: { rows: [{ id: "9" }] },
        },
        { match: "FROM Account WHERE id", result: { rows: [{ id: "1" }] } },
        {
          match: "is_available = TRUE AND start_time",
          result: { rows: [{ id: "10" }, { id: "11" }] },
        },
      ]);

      const res = await request(app)
        .post("/api/reservation")
        .set("Authorization", bearer("1", "user"))
        .send({
          schedule_id: "10",
          account_id: "1",
          time_reserved: 1,
          is_match: false,
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already active/i);
    });

    it("creates a plain (non-match) reservation", async () => {
      setupQueryStubs([
        {
          match: "FROM ScheduleCourt WHERE id",
          result: {
            rows: [
              {
                id: "10",
                court_id: "5",
                schedule_date: "2030-01-01",
                start_time: "10:00",
                end_time: "10:30",
              },
            ],
          },
        },
        { match: "FROM Reservation WHERE account_id", result: { rows: [] } },
        { match: "FROM Account WHERE id", result: { rows: [{ id: "1" }] } },
        {
          match: "is_available = TRUE AND start_time",
          result: { rows: [{ id: "10" }, { id: "11" }] },
        },
        // getPriceForReservationQuery
        {
          match: "FROM ScheduleCourtPrice WHERE schedule_id",
          result: { rows: [{ hourprice: 800, halfprice: 1100 }] },
        },
        // createReservationQuery
        {
          match: "INSERT INTO Reservation",
          result: {
            rows: [
              {
                id: "55",
                account_id: "1",
                schedule_id: "10",
                price: 800,
                status: "pending",
                start_time: "10:00",
                end_time: "11:00",
                is_match: false,
              },
            ],
          },
        },
        // updateReservationQuery (UPDATE ScheduleCourt SET is_available = FALSE) - 2 slots
        {
          match: "UPDATE ScheduleCourt SET is_available = FALSE",
          result: { rows: [] },
        },
        {
          match: "UPDATE ScheduleCourt SET is_available = FALSE",
          result: { rows: [] },
        },
      ]);

      const res = await request(app)
        .post("/api/reservation")
        .set("Authorization", bearer("1", "user"))
        .send({
          schedule_id: "10",
          account_id: "1",
          time_reserved: 1,
          is_match: false,
        });
      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ id: "55", status: "pending" });
    });
  });

  describe("POST /api/reservation/cancelrequest", () => {
    it("rejects when the reservation is already cancelled", async () => {
      setupQueryStubs([
        {
          match: "FROM Reservation WHERE id",
          result: {
            rows: [
              {
                id: "1",
                schedule_id: "10",
                start_time: "10:00",
                status: "cancelled",
                is_match: false,
              },
            ],
          },
        },
        {
          match: "FROM ScheduleCourt WHERE id",
          result: {
            rows: [{ id: "10", schedule_date: "2030-01-01" }],
          },
        },
        {
          match: "FROM CancelRequest WHERE reservation_id",
          result: { rows: [] },
        },
      ]);
      const res = await request(app)
        .post("/api/reservation/cancelrequest")
        .set("Authorization", bearer("1", "user"))
        .send({ reservation_id: "1", requested_by: "1", reason: "x" });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/cancelled/i);
    });

    it("rejects a request for a match reservation", async () => {
      setupQueryStubs([
        {
          match: "FROM Reservation WHERE id",
          result: {
            rows: [
              {
                id: "1",
                schedule_id: "10",
                start_time: "10:00",
                status: "pending",
                is_match: true,
              },
            ],
          },
        },
        {
          match: "FROM ScheduleCourt WHERE id",
          result: { rows: [{ id: "10", schedule_date: "2030-01-01" }] },
        },
        {
          match: "FROM CancelRequest WHERE reservation_id",
          result: { rows: [] },
        },
      ]);

      const res = await request(app)
        .post("/api/reservation/cancelrequest")
        .set("Authorization", bearer("1", "user"))
        .send({ reservation_id: "1", requested_by: "1", reason: "x" });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/is a match/i);
    });
  });

  describe("POST /api/reservation/cancelreservation", () => {
    it("is forbidden for a regular user", async () => {
      const res = await request(app)
        .post("/api/reservation/cancelreservation")
        .set("Authorization", bearer("1", "user"))
        .send({ reservation_id: "1", canceled_by: "1" });
      expect(res.status).toBe(403);
    });

    it("returns 404 when the reservation is missing", async () => {
      setupQueryStubs([
        { match: "FROM Reservation WHERE id", result: { rows: [] } },
      ]);
      const res = await request(app)
        .post("/api/reservation/cancelreservation")
        .set("Authorization", bearer("1", "admin"))
        .send({ reservation_id: "1", canceled_by: "1" });
      expect(res.status).toBe(404);
    });
  });
});
