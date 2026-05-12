import jwt from "jsonwebtoken";
import {
  generateToken,
  verifyToken,
} from "../../src/services/jwtService";

describe("jwtService", () => {
  it("generateToken returns a signed JWT carrying id and rol", () => {
    const token = generateToken("user-1", "user");
    const decoded = jwt.decode(token) as Record<string, any>;
    expect(decoded.id).toBe("user-1");
    expect(decoded.rol).toBe("user");
    expect(decoded.exp).toBeGreaterThan(decoded.iat);
  });

  it("verifyToken accepts the token it just signed", () => {
    const token = generateToken("user-1", "admin");
    const payload = verifyToken(token) as Record<string, any>;
    expect(payload.id).toBe("user-1");
    expect(payload.rol).toBe("admin");
  });

  it("verifyToken throws on a tampered token", () => {
    const token = generateToken("user-1", "user");
    expect(() => verifyToken(token + "tampered")).toThrow("Invalid token");
  });

  it("verifyToken throws on an unrelated string", () => {
    expect(() => verifyToken("not.a.jwt")).toThrow("Invalid token");
  });
});
