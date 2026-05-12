// Tests for the new auth endpoints: /refresh, /forgot-password, /reset-password.

jest.mock("pg", () => require("../mocks/pg"));
jest.mock("../../src/services/webSocket", () => require("../mocks/webSocket"));
jest.mock("../../src/services/mercadoPago", () => require("../mocks/mercadoPago"));
jest.mock("../../src/services/cloudinary", () => require("../mocks/cloudinary"));

import request from "supertest";
import { buildApp } from "../helpers/buildApp";
import { setupQueryStubs, resetQueryStubs } from "../helpers/queryMock";
import {
  generateRefreshToken,
  generateToken,
} from "../../src/services/jwtService";

const app = buildApp();

describe("POST /api/auth/refresh", () => {
  afterEach(() => resetQueryStubs());

  it("rejects an access token (must be a refresh token)", async () => {
    const access = generateToken("1", "user");
    const res = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: access });
    expect(res.status).toBe(401);
  });

  it("rejects gibberish", async () => {
    const res = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: "not-a-token" });
    expect(res.status).toBe(401);
  });

  it("returns a new pair when given a valid refresh token", async () => {
    setupQueryStubs([
      {
        match: "FROM Account WHERE id",
        result: { rows: [{ id: "1", account_type: "user" }] },
      },
    ]);
    const refresh = generateRefreshToken("1", "user");
    const res = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: refresh });
    expect(res.status).toBe(200);
    expect(typeof res.body.data.token).toBe("string");
    expect(typeof res.body.data.refreshToken).toBe("string");
    expect(res.body.data.rol).toBe("user");
  });
});

describe("POST /api/auth/forgot-password", () => {
  afterEach(() => resetQueryStubs());

  it("always returns 200 when the email is unknown (no enumeration)", async () => {
    setupQueryStubs([
      { match: "FROM Account WHERE email", result: { rows: [] } },
    ]);
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "ghost@example.com" });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeUndefined();
  });

  it("creates a reset token when the email exists and returns it in dev", async () => {
    setupQueryStubs([
      {
        match: "FROM Account WHERE email",
        result: { rows: [{ id: "10", account_type: "user" }] },
      },
      {
        match: "INSERT INTO PasswordResetToken",
        result: { rows: [{ id: 1 }] },
      },
    ]);

    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "real@example.com" });
    expect(res.status).toBe(200);
    // NODE_ENV is "test" in tests so we should get the token back
    expect(typeof res.body.token).toBe("string");
  });
});

describe("POST /api/auth/reset-password", () => {
  afterEach(() => resetQueryStubs());

  it("rejects an unknown token", async () => {
    setupQueryStubs([
      {
        match: "FROM PasswordResetToken",
        result: { rows: [] },
      },
    ]);
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "abc", new_password: "longenough" });
    expect(res.status).toBe(400);
  });

  it("updates the password and marks the token used", async () => {
    setupQueryStubs([
      {
        match: "FROM PasswordResetToken",
        result: { rows: [{ id: 1, account_id: "10" }] },
      },
      // updatePasswordQuery
      {
        match: "UPDATE Account SET password",
        result: { rows: [] },
      },
      // markPasswordResetUsedQuery
      {
        match: "UPDATE PasswordResetToken",
        result: { rows: [] },
      },
    ]);
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "abc", new_password: "longenough" });
    expect(res.status).toBe(200);
  });

  it("rejects short passwords", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "abc", new_password: "short" });
    expect(res.status).toBe(400);
  });
});
