jest.mock("pg", () => require("../mocks/pg"));
jest.mock("../../src/services/webSocket", () => require("../mocks/webSocket"));
jest.mock("../../src/services/mercadoPago", () => require("../mocks/mercadoPago"));
jest.mock("../../src/services/cloudinary", () => require("../mocks/cloudinary"));

import request from "supertest";
import { buildApp } from "../helpers/buildApp";
import { setupQueryStubs, resetQueryStubs } from "../helpers/queryMock";
import { bearer } from "../helpers/auth";

const app = buildApp();

describe("Match router", () => {
  afterEach(() => resetQueryStubs());

  describe("GET /api/match", () => {
    it("requires auth", async () => {
      const res = await request(app).get("/api/match");
      expect(res.status).toBe(401);
    });

    it("returns the list of matches", async () => {
      setupQueryStubs([
        { match: "FROM Match", result: { rows: [{ id: "1" }] } },
      ]);
      const res = await request(app)
        .get("/api/match")
        .set("Authorization", bearer("1", "user"));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe("POST /api/match/join", () => {
    it("returns 404 when the match doesn't exist", async () => {
      setupQueryStubs([
        // getMatchByIdQuery
        { match: "FROM Match WHERE id", result: { rows: [] } },
        // getAccountByIdQuery
        { match: "FROM Account WHERE id", result: { rows: [{ id: "1" }] } },
        // getCantPlayersByScheduleQuery
        { match: "FROM Sport s", result: { rows: [{ max_players: 4 }] } },
        // getPlayerJoinedByMatchQuery
        { match: "FROM MatchPlayer", result: { rows: [] } },
      ]);

      const res = await request(app)
        .post("/api/match/join")
        .set("Authorization", bearer("1", "user"))
        .send({ match_id: "99", player_id: "1" });
      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Match not found");
    });

    it("rejects admins from joining", async () => {
      setupQueryStubs([
        {
          match: "FROM Match WHERE id",
          result: {
            rows: [
              {
                id: "1",
                status: "pending",
                creator_id: "9",
                reservation_id: "5",
              },
            ],
          },
        },
        {
          match: "FROM Account WHERE id",
          result: { rows: [{ id: "1", account_type: "admin" }] },
        },
        { match: "FROM Sport s", result: { rows: [{ max_players: 4 }] } },
        { match: "FROM MatchPlayer", result: { rows: [] } },
      ]);

      const res = await request(app)
        .post("/api/match/join")
        .set("Authorization", bearer("1", "user"))
        .send({ match_id: "1", player_id: "1" });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Admins cannot join/);
    });

    it("rejects when player has already joined", async () => {
      setupQueryStubs([
        {
          match: "FROM Match WHERE id",
          result: {
            rows: [
              {
                id: "1",
                status: "pending",
                creator_id: "9",
                reservation_id: "5",
              },
            ],
          },
        },
        {
          match: "FROM Account WHERE id",
          result: { rows: [{ id: "1", account_type: "user" }] },
        },
        { match: "FROM Sport s", result: { rows: [{ max_players: 4 }] } },
        {
          match: "FROM MatchPlayer",
          result: { rows: [{ match_id: "1", player_id: "1" }] },
        },
      ]);

      const res = await request(app)
        .post("/api/match/join")
        .set("Authorization", bearer("1", "user"))
        .send({ match_id: "1", player_id: "1" });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already joined/i);
    });

    it("joins a player and completes the match when it fills up", async () => {
      setupQueryStubs([
        {
          match: "FROM Match WHERE id",
          result: {
            rows: [
              {
                id: "1",
                status: "pending",
                creator_id: "9",
                reservation_id: "5",
                current_players: 3,
                total_players: 4,
              },
            ],
          },
        },
        {
          match: "FROM Account WHERE id",
          result: { rows: [{ id: "1", account_type: "user" }] },
        },
        { match: "FROM Sport s", result: { rows: [{ max_players: 4 }] } },
        { match: "FROM MatchPlayer", result: { rows: [] } },
        // updatePlayersCountQuery -> match is now full
        {
          match: "UPDATE Match SET current_players",
          result: { rows: [{ id: "1", current_players: 4 }] },
        },
        // updateStatusMatchQuery -> completed
        {
          match: "UPDATE Match SET status",
          result: { rows: [{ id: "1", status: "completed" }] },
        },
        // updatePreReserveStatusQuery
        {
          match: "UPDATE PreRegistration",
          result: { rows: [] },
        },
        // updateReservationStatusQuery -> confirmed
        {
          match: "UPDATE Reservation SET status",
          result: { rows: [{ id: "5", status: "confirmed" }] },
        },
        // joinMatchQuery
        {
          match: "INSERT INTO MatchPlayer",
          result: { rows: [{ match_id: "1", player_id: "1" }] },
        },
      ]);

      const res = await request(app)
        .post("/api/match/join")
        .set("Authorization", bearer("1", "user"))
        .send({ match_id: "1", player_id: "1" });
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ match_id: "1", player_id: "1" });
    });
  });

  describe("POST /api/match/leave", () => {
    it("blocks the creator from leaving", async () => {
      setupQueryStubs([
        {
          match: "FROM Match WHERE id",
          result: {
            rows: [
              {
                id: "1",
                status: "pending",
                creator_id: "1",
                reservation_id: "5",
                current_players: 2,
              },
            ],
          },
        },
      ]);

      const res = await request(app)
        .post("/api/match/leave")
        .set("Authorization", bearer("1", "user"))
        .send({ match_id: "1", player_id: "1" });
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/Creator Match cannot leave/);
    });

    it("blocks leaving a completed match", async () => {
      setupQueryStubs([
        {
          match: "FROM Match WHERE id",
          result: {
            rows: [
              {
                id: "1",
                status: "completed",
                creator_id: "9",
                reservation_id: "5",
              },
            ],
          },
        },
      ]);

      const res = await request(app)
        .post("/api/match/leave")
        .set("Authorization", bearer("1", "user"))
        .send({ match_id: "1", player_id: "1" });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already completed/);
    });
  });
});
