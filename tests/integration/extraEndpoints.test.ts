// Tests for the new "small" endpoints: /sport/:id, /court/complex/:id,
// /court/:id, /payment/upload/sign, and ownership behaviors.

jest.mock("pg", () => require("../mocks/pg"));
jest.mock("../../src/services/webSocket", () => require("../mocks/webSocket"));
jest.mock("../../src/services/mercadoPago", () => require("../mocks/mercadoPago"));
jest.mock("../../src/services/cloudinary", () => require("../mocks/cloudinary"));

import request from "supertest";
import { buildApp } from "../helpers/buildApp";
import { setupQueryStubs, resetQueryStubs } from "../helpers/queryMock";
import { bearer } from "../helpers/auth";

const app = buildApp();

describe("GET /api/sport/:id", () => {
  afterEach(() => resetQueryStubs());

  it("returns 404 when missing", async () => {
    setupQueryStubs([
      { match: "FROM Sport WHERE id", result: { rows: [] } },
    ]);
    const res = await request(app)
      .get("/api/sport/1")
      .set("Authorization", bearer("1", "user"));
    expect(res.status).toBe(404);
  });

  it("returns the sport", async () => {
    setupQueryStubs([
      {
        match: "FROM Sport WHERE id",
        result: { rows: [{ id: 1, name: "padel", max_players: 4 }] },
      },
    ]);
    const res = await request(app)
      .get("/api/sport/1")
      .set("Authorization", bearer("1", "user"));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ name: "padel" });
  });
});

describe("GET /api/court/:id", () => {
  afterEach(() => resetQueryStubs());

  it("returns the court", async () => {
    setupQueryStubs([
      {
        match: "FROM Court WHERE id",
        result: { rows: [{ id: "1", name: "Court 1" }] },
      },
    ]);
    const res = await request(app)
      .get("/api/court/1")
      .set("Authorization", bearer("1", "user"));
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe("1");
  });

  it("returns 404 when missing", async () => {
    setupQueryStubs([
      { match: "FROM Court WHERE id", result: { rows: [] } },
    ]);
    const res = await request(app)
      .get("/api/court/99")
      .set("Authorization", bearer("1", "user"));
    expect(res.status).toBe(404);
  });
});

describe("GET /api/court/complex/:complexId", () => {
  afterEach(() => resetQueryStubs());

  it("returns courts for a complex", async () => {
    setupQueryStubs([
      {
        match: /FROM Court\s+WHERE complex_id/,
        result: {
          rows: [
            { id: "1", complex_id: "5", name: "Court 1" },
            { id: "2", complex_id: "5", name: "Court 2" },
          ],
        },
      },
    ]);
    const res = await request(app)
      .get("/api/court/complex/5")
      .set("Authorization", bearer("1", "user"));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });
});

describe("GET /api/payment/upload/sign", () => {
  beforeAll(() => {
    process.env.CLOUDINARY_CLOUD_NAME = "test_cloud";
    process.env.CLOUDINARY_API_KEY = "test_key";
    process.env.CLOUDINARY_API_SECRET = "test_secret";
  });

  it("requires auth", async () => {
    const res = await request(app).get("/api/payment/upload/sign");
    expect(res.status).toBe(401);
  });

  it("returns signature, timestamp, folder and api info", async () => {
    const res = await request(app)
      .get("/api/payment/upload/sign")
      .set("Authorization", bearer("1", "user"));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(
      expect.objectContaining({
        signature: expect.any(String),
        timestamp: expect.any(Number),
        folder: "matchplay",
        cloud_name: "test_cloud",
        api_key: "test_key",
      })
    );
  });

  it("honors the folder query parameter", async () => {
    const res = await request(app)
      .get("/api/payment/upload/sign?folder=proofs")
      .set("Authorization", bearer("1", "user"));
    expect(res.body.data.folder).toBe("proofs");
  });
});

describe("Ownership on GET /api/payment/account/:accountId", () => {
  afterEach(() => resetQueryStubs());

  it("rejects when another user tries to read someone else's payments", async () => {
    const res = await request(app)
      .get("/api/payment/account/999")
      .set("Authorization", bearer("7", "user"));
    expect(res.status).toBe(403);
  });

  it("allows the same user", async () => {
    setupQueryStubs([
      {
        match: "FROM Payment WHERE user_id",
        result: { rows: [{ id: "1" }] },
      },
    ]);
    const res = await request(app)
      .get("/api/payment/account/7")
      .set("Authorization", bearer("7", "user"));
    expect(res.status).toBe(200);
  });

  it("allows admin to read anyone's payments", async () => {
    setupQueryStubs([
      {
        match: "FROM Payment WHERE user_id",
        result: { rows: [] },
      },
    ]);
    const res = await request(app)
      .get("/api/payment/account/999")
      .set("Authorization", bearer("1", "admin"));
    expect(res.status).toBe(200);
  });
});
