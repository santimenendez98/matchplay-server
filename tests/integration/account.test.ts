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
    it("creates a user account and returns a token", async () => {
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
                password: "hashed",
              },
            ],
          },
        },
      ]);

      const res = await request(app).post("/api/account").send({
        name: "Santi",
        email: "s@example.com",
        password: "secret-long",
        birthdate: "1998-09-18",
        phone: "099111222",
      });

      expect(res.status).toBe(201);
      expect(res.body.data.account).toMatchObject({
        id: "10",
        account_type: "user",
      });
      expect(res.body.data.account.password).toBeUndefined();
      expect(typeof res.body.data.token).toBe("string");
      expect(typeof res.body.data.refreshToken).toBe("string");
    });

    it("ignores account_type and always creates a user (no admin escalation)", async () => {
      let insertedRole: string | undefined;
      setupQueryStubs([
        {
          match: "INSERT INTO Account",
          result: {
            rows: [
              {
                id: "11",
                account_type: "user",
                email: "x@example.com",
                password: "hashed",
              },
            ],
          },
        },
      ]);

      const res = await request(app).post("/api/account").send({
        name: "x",
        email: "x@example.com",
        password: "secret-long",
        birthdate: "1998-09-18",
        phone: "099111222",
        account_type: "admin", // attempted escalation
      });
      expect(res.status).toBe(201);
      expect(res.body.data.account.account_type).toBe("user");
    });

    it("rejects an invalid email", async () => {
      const res = await request(app).post("/api/account").send({
        name: "x",
        email: "not-an-email",
        password: "secret-long",
        birthdate: "1998-09-18",
        phone: "099111222",
      });
      expect(res.status).toBe(400);
    });

    it("rejects short passwords", async () => {
      const res = await request(app).post("/api/account").send({
        name: "x",
        email: "x@example.com",
        password: "short",
        birthdate: "1998-09-18",
        phone: "099111222",
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
