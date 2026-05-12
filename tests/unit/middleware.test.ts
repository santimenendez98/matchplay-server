import { authMiddleware, rolMiddleware } from "../../src/middleware";
import { generateToken } from "../../src/services/jwtService";
import { handleValidationErrors } from "../../src/middleware/validatorErrors";
import { Request, Response } from "express";

const makeReqRes = (overrides: Partial<Request> = {}) => {
  const req = { headers: {}, ...overrides } as Request;
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status, json } as unknown as Response;
  const next = jest.fn();
  return { req, res, next, status, json };
};

describe("authMiddleware", () => {
  it("rejects requests without an Authorization header", () => {
    const { req, res, next, status, json } = makeReqRes();
    authMiddleware(req, res, next);
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: "Access token is required" });
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects requests with a non-Bearer Authorization header", () => {
    const { req, res, next, status } = makeReqRes({
      headers: { authorization: "Basic abc" },
    } as any);
    authMiddleware(req, res, next);
    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects invalid bearer tokens", () => {
    const { req, res, next, status, json } = makeReqRes({
      headers: { authorization: "Bearer not-a-real-jwt" },
    } as any);
    authMiddleware(req, res, next);
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({
      message: "Invalid or expired access token",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("attaches decoded user and calls next() on a valid token", () => {
    const token = generateToken("123", "admin");
    const { req, res, next } = makeReqRes({
      headers: { authorization: `Bearer ${token}` },
    } as any);
    authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect((req as any).user).toMatchObject({ id: "123", rol: "admin" });
  });
});

describe("rolMiddleware", () => {
  it("rejects with 403 when no user is on the request", () => {
    const { req, res, next, status, json } = makeReqRes();
    rolMiddleware(["admin"])(req, res, next);
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ message: "Forbidden" });
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects with 403 when the user's rol is not allowed", () => {
    const { req, res, next, status } = makeReqRes({
      user: { id: "1", rol: "user" },
    } as any);
    rolMiddleware(["admin"])(req, res, next);
    expect(status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() when the user's rol matches one of the allowed roles", () => {
    const { req, res, next } = makeReqRes({
      user: { id: "1", rol: "admin" },
    } as any);
    rolMiddleware(["admin", "creator"])(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

jest.mock("express-validator", () => {
  const actual = jest.requireActual("express-validator");
  return { ...actual, validationResult: jest.fn() };
});

describe("handleValidationErrors", () => {
  const { validationResult } = require("express-validator");

  beforeEach(() => {
    (validationResult as jest.Mock).mockReset();
  });

  it("calls next() when there are no validation errors", () => {
    (validationResult as jest.Mock).mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });
    const { req, res, next, status } = makeReqRes();
    handleValidationErrors(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(status).not.toHaveBeenCalled();
  });

  it("responds with 400 and the formatted errors when validation fails", () => {
    (validationResult as jest.Mock).mockReturnValue({
      isEmpty: () => false,
      array: () => [{ path: "email", msg: "Email is required" }],
    });
    const { req, res, next, status, json } = makeReqRes();
    handleValidationErrors(req, res, next);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      message: "Validation failed",
      errors: [{ field: "email", message: "Email is required" }],
    });
    expect(next).not.toHaveBeenCalled();
  });
});
