import { verifyToken } from "../services/jwtService";
import { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; rol: string; type?: string };
    }
  }
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Access token is required" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token);
    // Reject refresh tokens used as access tokens
    if (decoded.type && decoded.type !== "access") {
      return res
        .status(401)
        .json({ message: "Invalid or expired access token" });
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired access token" });
  }
};

export const rolMiddleware = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
};

export default {
  authMiddleware,
  rolMiddleware,
};
