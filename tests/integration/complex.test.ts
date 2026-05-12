jest.mock("pg", () => require("../mocks/pg"));
jest.mock("../../src/services/webSocket", () => require("../mocks/webSocket"));
jest.mock("../../src/services/mercadoPago", () => require("../mocks/mercadoPago"));
jest.mock("../../src/services/cloudinary", () => require("../mocks/cloudinary"));

import request from "supertest";
import { buildApp } from "../helpers/buildApp";
import { setupQueryStubs, resetQueryStubs } from "../helpers/queryMock";
import { bearer } from "../helpers/auth";

const app = buildApp();

const cloudinary = require("../../src/services/cloudinary");

describe("Complex router", () => {
  afterEach(() => {
    resetQueryStubs();
    (cloudinary.verifyCloudinaryFile as jest.Mock).mockReset();
  });

  it("GET /api/complex requires auth", async () => {
    const res = await request(app).get("/api/complex");
    expect(res.status).toBe(401);
  });

  it("GET /api/complex returns the list", async () => {
    setupQueryStubs([
      { match: "FROM Complex", result: { rows: [{ id: 1, name: "Foo" }] } },
    ]);
    const res = await request(app)
      .get("/api/complex")
      .set("Authorization", bearer("1", "user"));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it("POST /api/complex is forbidden for non-creator", async () => {
    const res = await request(app)
      .post("/api/complex")
      .set("Authorization", bearer("1", "admin"))
      .send({
        admin_id: "5",
        name: "X",
        location: "Y",
        description: "Z",
      });
    expect(res.status).toBe(403);
  });

  it("POST /api/complex returns 400 when admin_id is not an admin account", async () => {
    setupQueryStubs([
      { match: "account_type = 'admin'", result: { rows: [] } },
    ]);

    const res = await request(app)
      .post("/api/complex")
      .set("Authorization", bearer("1", "creator"))
      .send({
        admin_id: "5",
        name: "X",
        location: "Y",
        description: "Z",
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/admin/);
  });

  it("POST /api/complex creates a complex when payload is valid", async () => {
    setupQueryStubs([
      { match: "account_type = 'admin'", result: { rows: [{ id: "5" }] } },
      {
        match: "INSERT INTO Complex",
        result: { rows: [{ id: 1, admin_id: "5", name: "X" }] },
      },
    ]);

    const res = await request(app)
      .post("/api/complex")
      .set("Authorization", bearer("1", "creator"))
      .send({
        admin_id: "5",
        name: "X",
        location: "Y",
        description: "Z",
      });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ id: 1, name: "X" });
  });

  it("POST /api/complex rejects invalid image_url against Cloudinary", async () => {
    setupQueryStubs([
      { match: "account_type = 'admin'", result: { rows: [{ id: "5" }] } },
    ]);
    (cloudinary.verifyCloudinaryFile as jest.Mock).mockResolvedValue(false);

    const res = await request(app)
      .post("/api/complex")
      .set("Authorization", bearer("1", "creator"))
      .send({
        admin_id: "5",
        name: "X",
        location: "Y",
        description: "Z",
        image_url: "bad",
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/image/i);
  });

  it("PUT /api/complex/:id updates an existing complex", async () => {
    setupQueryStubs([
      { match: "FROM Complex WHERE id", result: { rows: [{ id: 1 }] } },
      {
        match: "UPDATE Complex SET",
        result: { rows: [{ id: 1, name: "Renamed" }] },
      },
    ]);

    const res = await request(app)
      .put("/api/complex/1")
      .set("Authorization", bearer("1", "admin"))
      .send({ name: "Renamed" });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ name: "Renamed" });
  });

  it("PUT /api/complex/:id returns 404 when complex is missing", async () => {
    setupQueryStubs([
      { match: "FROM Complex WHERE id", result: { rows: [] } },
    ]);
    const res = await request(app)
      .put("/api/complex/999")
      .set("Authorization", bearer("1", "admin"))
      .send({ name: "x" });
    expect(res.status).toBe(404);
  });
});
