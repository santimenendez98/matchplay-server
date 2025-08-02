import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";

export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((error) => {
      const field = "path" in error ? error.path : "unknown";
      return {
        field,
        message: error.msg,
      };
    });
    return res.status(400).json({
      message: "Validation failed",
      errors: formattedErrors,
    });
  }
  next();
};
