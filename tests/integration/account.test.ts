// Integration tests for the /api/account router.

jest.mock("pg", () => require("../mocks/pg"));
jest.mock("../../src/services/webSocket", () => require("../mocks/webSocket"));
jest.mock("../../src/services/mercadoPago", () => require("../mocks/mercadoPago"));
jest.mock("../../src/services/cloudinary", () => require("../mocks/cloudinary"));

import request from "supertest";
import { buildApp } from "../helpers/buildApp";
import { setupQueryStubs, resetQueryStubs } from "../helpers/queryMock";
import { bearer } from "../helpers/auth";

const app = buildApp();

describe("Account router", () => {
  afterEach(() => resetQueryStubs());

  describe("POST /api/account (public registration)", () => {
    it("creates an account when payload is valid", async () => {
      setupQueryStubs([
        {
          match: "INSERT INTO Account",
          result: {
            rows: [
              {
                id: "10",
                name: "Santi",
                email: "s@example.com",
                birthdate: "1998-09-18",
                phone: "099111222",
                account_type: "user",
              },
            ],
          },
        },
      ]);

      const res = await request(app).post("/api/account").send({
        name: "Santi",
        email: "s@example.com",
        password: "secret",
        birthdate: "1998-09-18",
        phone: "099111222",
        account_type: "user",
      });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ id: "10", account_type: "user" });
    });

    it("rejects an invalid email", async () => {
      const res = await request(app).post("/api/account").send({
        name: "x",
        email: "not-an-email",
        password: "secret",
        birthdate: "1998-09-18",
        phone: "099111222",
        account_type: "user",
      });
      expect(res.status).toBe(400);
    });

    it("rejects an unknown account_type", async () => {
      const res = await request(app).post("/api/account").send({
        name: "x",
        email: "x@example.com",
        password: "secret",
        birthdate: "1998-09-18",
        phone: "099111222",
        account_type: "creator",
      });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/account", () => {
    it("returns 401 when no token is provided", async () => {
      const res = await request(app).get("/api/account");
      expect(res.status).toBe(401);
    });

    it("returns 403 for a regular user (creator-only endpoint)", async () => {
      const res = await request(app)
        .get("/api/account")
        .set("Authorization", bearer("1", "user"));
      expect(res.status).toBe(403);
    });

    it("returns the list when called by a creator", async () => {
      setupQueryStubs([
        {
          match: "FROM Account",
          result: {
            rows: [{ id: "1", email: "a@b.com" }],
          },
        },
      ]);
      const res = await request(app)
        .get("/api/account")
        .set("Authorization", bearer("99", "creator"));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe("PUT /api/account/:id", () => {
    it("requires authentication", async () => {
      const res = await request(app).put("/api/account/1").send({ name: "X" });
      expect(res.status).toBe(401);
    });

    it("rejects if no updatable fields are sent", async () => {
      setupQueryStubs([
        { match: "FROM Account WHERE id", result: { rows: [{ id: "1" }] } },
      ]);
      const res = await request(app)
        .put("/api/account/1")
        .set("Authorization", bearer("1", "user"))
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("No fields to update");
    });

    it("returns 404 when the account is not found", async () => {
      setupQueryStubs([
        { match: "FROM Account WHERE id", result: { rows: [] } },
      ]);
      const res = await request(app)
        .put("/api/account/999")
        .set("Authorization", bearer("1", "user"))
        .send({ name: "New name" });
      expect(res.status).toBe(404);
    });

    it("updates the account when fields are provided", async () => {
      setupQueryStubs([
        { match: "FROM Account WHERE id", result: { rows: [{ id: "1" }] } },
        {
          match: "UPDATE account SET",
          result: { rows: [{ id: "1", name: "New name" }] },
        },
      ]);
      const res = await request(app)
        .put("/api/account/1")
        .set("Authorization", bearer("1", "user"))
        .send({ name: "New name" });
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("New name");
    });
  });
});
