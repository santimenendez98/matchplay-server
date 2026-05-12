// Token helpers that mirror what `services/jwtService` produces.
// Use these to sign requests in integration tests.

import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "test_secret";

export const signTokenFor = (
  id: string,
  rol: "user" | "admin" | "creator"
): string => jwt.sign({ id, rol }, SECRET, { expiresIn: "1h" });

export const bearer = (id: string, rol: "user" | "admin" | "creator") =>
  `Bearer ${signTokenFor(id, rol)}`;
