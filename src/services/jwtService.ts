import jwt, { SignOptions } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "defaultsecret";
const ACCESS_TOKEN_TTL = (process.env.JWT_ACCESS_TTL ||
  "1h") as SignOptions["expiresIn"];
const REFRESH_TOKEN_TTL = (process.env.JWT_REFRESH_TTL ||
  "30d") as SignOptions["expiresIn"];

type TokenType = "access" | "refresh";

interface TokenPayload {
  id: string;
  rol: string;
  type: TokenType;
}

const sign = (
  userId: string,
  userRol: string,
  type: TokenType,
  expiresIn: SignOptions["expiresIn"]
) =>
  jwt.sign(
    { id: userId, rol: userRol, type } satisfies TokenPayload,
    JWT_SECRET,
    { expiresIn }
  );

export const generateToken = (userId: string, userRol: string) =>
  sign(userId, userRol, "access", ACCESS_TOKEN_TTL);

export const generateRefreshToken = (userId: string, userRol: string) =>
  sign(userId, userRol, "refresh", REFRESH_TOKEN_TTL);

export const verifyToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    throw new Error("Invalid token");
  }
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  const payload = verifyToken(token);
  if (payload.type !== "refresh") {
    throw new Error("Invalid token");
  }
  return payload;
};

export default {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
};
