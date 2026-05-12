// Integration tests for POST /api/auth (login).

jest.mock("pg", () => require("../mocks/pg"));
jest.mock("../../src/services/webSocket", () => require("../mocks/webSocket"));
jest.mock("../../src/services/mercadoPago", () => require("../mocks/mercadoPago"));
jest.mock("../../src/services/cloudinary", () => require("../mocks/cloudinary"));

import request from "supertest";
import { buildApp } from "../helpers/buildApp";
import { setupQueryStubs, resetQueryStubs } from "../helpers/queryMock";
import { hashPassword } from "../../src/services/bcrypService";

const app = buildApp();

describe("POST /api/auth", () => {
  afterEach(() => resetQueryStubs());

  it("returns 400 when payload is missing required fields", async () => {
    const res = await request(app).post("/api/auth").send({});
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "email" }),
        expect.objectContaining({ field: "password" }),
      ])
    );
  });

  it("returns 400 on a malformed email", async () => {
    const res = await request(app)
      .post("/api/auth")
      .send({ email: "not-an-email", password: "x" });
    expect(res.status).toBe(400);
  });

  it("returns 404 when the account does not exist", async () => {
    setupQueryStubs([{ match: "FROM Account WHERE email", result: { rows: [] } }]);
    const res = await request(app)
      .post("/api/auth")
      .send({ email: "missing@example.com", password: "x" });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Account not found");
  });

  it("returns 401 when the password is wrong", async () => {
    const hash = await hashPassword("right-password");
    setupQueryStubs([
      {
        match: "FROM Account WHERE email",
        result: {
          rows: [
            {
              id: "1",
              email: "a@b.com",
              password: hash,
              account_type: "user",
            },
          ],
        },
      },
    ]);

    const res = await request(app)
      .post("/api/auth")
      .send({ email: "a@b.com", password: "wrong" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid password");
  });

  it("returns 200 with token and rol when credentials are valid", async () => {
    const hash = await hashPassword("right-password");
    setupQueryStubs([
      {
        match: "FROM Account WHERE email",
        result: {
          rows: [
            {
              id: "1",
              email: "a@b.com",
              password: hash,
              account_type: "user",
            },
          ],
        },
      },
    ]);

    const res = await request(app)
      .post("/api/auth")
      .send({ email: "a@b.com", password: "right-password" });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: "1", rol: "user" });
    expect(typeof res.body.data.token).toBe("string");
  });
});
