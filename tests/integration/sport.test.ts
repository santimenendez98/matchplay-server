jest.mock("pg", () => require("../mocks/pg"));
jest.mock("../../src/services/webSocket", () => require("../mocks/webSocket"));
jest.mock("../../src/services/mercadoPago", () => require("../mocks/mercadoPago"));
jest.mock("../../src/services/cloudinary", () => require("../mocks/cloudinary"));

import request from "supertest";
import { buildApp } from "../helpers/buildApp";
import { setupQueryStubs, resetQueryStubs } from "../helpers/queryMock";
import { bearer } from "../helpers/auth";

const app = buildApp();

describe("Sport router", () => {
  afterEach(() => resetQueryStubs());

  it("GET /api/sport requires authentication", async () => {
    const res = await request(app).get("/api/sport");
    expect(res.status).toBe(401);
  });

  it("GET /api/sport returns all sports for a user", async () => {
    setupQueryStubs([
      {
        match: "FROM Sport",
        result: { rows: [{ id: 1, name: "futbol", max_players: 10 }] },
      },
    ]);
    const res = await request(app)
      .get("/api/sport")
      .set("Authorization", bearer("1", "user"));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it("POST /api/sport is forbidden for admins (creator-only)", async () => {
    const res = await request(app)
      .post("/api/sport")
      .set("Authorization", bearer("1", "admin"))
      .send({ name: "Padel", max_players: 4 });
    expect(res.status).toBe(403);
  });

  it("POST /api/sport creates a sport for a creator", async () => {
    setupQueryStubs([
      {
        match: "INSERT INTO Sport",
        result: { rows: [{ id: 2, name: "padel", max_players: 4 }] },
      },
    ]);
    const res = await request(app)
      .post("/api/sport")
      .set("Authorization", bearer("1", "creator"))
      .send({ name: "Padel", max_players: 4 });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ name: "padel" });
  });

  it("POST /api/sport rejects non-numeric max_players", async () => {
    const res = await request(app)
      .post("/api/sport")
      .set("Authorization", bearer("1", "creator"))
      .send({ name: "x", max_players: "many" });
    expect(res.status).toBe(400);
  });

  it("DELETE /api/sport/:id returns 404 when not found", async () => {
    setupQueryStubs([
      { match: "DELETE FROM Sport", result: { rows: [] } },
    ]);
    const res = await request(app)
      .delete("/api/sport/999")
      .set("Authorization", bearer("1", "creator"));
    expect(res.status).toBe(404);
  });
});
