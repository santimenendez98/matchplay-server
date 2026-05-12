jest.mock("pg", () => require("../mocks/pg"));
jest.mock("../../src/services/webSocket", () => require("../mocks/webSocket"));
jest.mock("../../src/services/mercadoPago", () => require("../mocks/mercadoPago"));
jest.mock("../../src/services/cloudinary", () => require("../mocks/cloudinary"));

import request from "supertest";
import { buildApp } from "../helpers/buildApp";
import { setupQueryStubs, resetQueryStubs } from "../helpers/queryMock";
import { bearer } from "../helpers/auth";

const app = buildApp();

describe("Court router", () => {
  afterEach(() => resetQueryStubs());

  it("GET /api/court returns the list of courts", async () => {
    setupQueryStubs([
      { match: "FROM Court", result: { rows: [{ id: "1", name: "Court 1" }] } },
    ]);
    const res = await request(app)
      .get("/api/court")
      .set("Authorization", bearer("1", "user"));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it("POST /api/court is forbidden for non-admin", async () => {
    const res = await request(app)
      .post("/api/court")
      .set("Authorization", bearer("1", "user"))
      .send({ complex_id: "1", sport_id: "1", name: "Court A" });
    expect(res.status).toBe(403);
  });

  it("POST /api/court creates a court for an admin", async () => {
    setupQueryStubs([
      {
        match: "INSERT INTO Court",
        result: { rows: [{ id: "1", name: "Court A" }] },
      },
    ]);
    const res = await request(app)
      .post("/api/court")
      .set("Authorization", bearer("1", "admin"))
      .send({ complex_id: "1", sport_id: "1", name: "Court A" });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("Court A");
  });

  it("POST /api/court rejects missing fields", async () => {
    const res = await request(app)
      .post("/api/court")
      .set("Authorization", bearer("1", "admin"))
      .send({});
    expect(res.status).toBe(400);
  });

  it("DELETE /api/court/:id returns 404 when missing", async () => {
    setupQueryStubs([{ match: "DELETE FROM Court", result: { rows: [] } }]);
    const res = await request(app)
      .delete("/api/court/999")
      .set("Authorization", bearer("1", "admin"));
    expect(res.status).toBe(404);
  });

  it("PUT /api/court/:id rejects when no fields are provided", async () => {
    setupQueryStubs([
      { match: "FROM Court WHERE id", result: { rows: [{ id: "1" }] } },
    ]);
    const res = await request(app)
      .put("/api/court/1")
      .set("Authorization", bearer("1", "admin"))
      .send({});
    expect(res.status).toBe(400);
  });

  it("PUT /api/court/:id updates a court", async () => {
    setupQueryStubs([
      { match: "FROM Court WHERE id", result: { rows: [{ id: "1" }] } },
      {
        match: "UPDATE Court SET",
        result: { rows: [{ id: "1", name: "Renamed" }] },
      },
    ]);
    const res = await request(app)
      .put("/api/court/1")
      .set("Authorization", bearer("1", "admin"))
      .send({ name: "Renamed" });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Renamed");
  });
});
