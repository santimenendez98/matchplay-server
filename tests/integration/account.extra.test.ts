// Tests for /api/account/admin and /api/account/me/password.

jest.mock("pg", () => require("../mocks/pg"));
jest.mock("../../src/services/webSocket", () => require("../mocks/webSocket"));
jest.mock("../../src/services/mercadoPago", () => require("../mocks/mercadoPago"));
jest.mock("../../src/services/cloudinary", () => require("../mocks/cloudinary"));

import request from "supertest";
import { buildApp } from "../helpers/buildApp";
import { setupQueryStubs, resetQueryStubs } from "../helpers/queryMock";
import { bearer } from "../helpers/auth";
import { hashPassword } from "../../src/services/bcrypService";

const app = buildApp();

describe("POST /api/account/admin", () => {
  afterEach(() => resetQueryStubs());

  it("is forbidden for non-creator", async () => {
    const res = await request(app)
      .post("/api/account/admin")
      .set("Authorization", bearer("1", "admin"))
      .send({
        name: "Admin",
        email: "a@b.com",
        password: "longenough",
        birthdate: "1990-01-01",
        phone: "099111222",
      });
    expect(res.status).toBe(403);
  });

  it("creates an admin account when called by the creator", async () => {
    setupQueryStubs([
      {
        match: "INSERT INTO Account",
        result: {
          rows: [
            {
              id: "20",
              email: "a@b.com",
              account_type: "admin",
              password: "hashed",
            },
          ],
        },
      },
    ]);
    const res = await request(app)
      .post("/api/account/admin")
      .set("Authorization", bearer("99", "creator"))
      .send({
        name: "Admin",
        email: "a@b.com",
        password: "longenough",
        birthdate: "1990-01-01",
        phone: "099111222",
      });
    expect(res.status).toBe(201);
    expect(res.body.data.account_type).toBe("admin");
    expect(res.body.data.password).toBeUndefined();
  });
});

describe("PATCH /api/account/me/password", () => {
  afterEach(() => resetQueryStubs());

  it("requires auth", async () => {
    const res = await request(app)
      .patch("/api/account/me/password")
      .send({ current_password: "x", new_password: "longenough" });
    expect(res.status).toBe(401);
  });

  it("rejects when current password is wrong", async () => {
    const hash = await hashPassword("right-one");
    setupQueryStubs([
      {
        match: "FROM Account WHERE id",
        result: { rows: [{ id: "7", password: hash }] },
      },
    ]);
    const res = await request(app)
      .patch("/api/account/me/password")
      .set("Authorization", bearer("7", "user"))
      .send({ current_password: "wrong-one", new_password: "longenough" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/incorrect/);
  });

  it("updates the password when current is correct", async () => {
    const hash = await hashPassword("right-one");
    setupQueryStubs([
      {
        match: "FROM Account WHERE id",
        result: { rows: [{ id: "7", password: hash }] },
      },
      {
        match: "UPDATE Account SET password",
        result: { rows: [] },
      },
    ]);
    const res = await request(app)
      .patch("/api/account/me/password")
      .set("Authorization", bearer("7", "user"))
      .send({ current_password: "right-one", new_password: "longenough" });
    expect(res.status).toBe(200);
  });

  it("rejects short new passwords", async () => {
    const res = await request(app)
      .patch("/api/account/me/password")
      .set("Authorization", bearer("7", "user"))
      .send({ current_password: "right-one", new_password: "short" });
    expect(res.status).toBe(400);
  });
});
