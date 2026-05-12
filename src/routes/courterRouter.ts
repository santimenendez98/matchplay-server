import { Router } from "express";
import {
  getCourts,
  getCourt,
  getCourtsByComplex,
  createCourt,
  deleteCourt,
  updateAccount,
} from "../controllers/Court";
import { authMiddleware, rolMiddleware } from "../middleware";
import { body, param } from "express-validator";
import { handleValidationErrors } from "../middleware/validatorErrors";

export const courtRouter = Router();

// Get all courts
courtRouter.get("/", authMiddleware, getCourts);

// Get courts for a complex
courtRouter.get(
  "/complex/:complexId",
  param("complexId")
    .notEmpty()
    .withMessage("Complex ID is required")
    .isString()
    .withMessage("Complex ID must be a string"),
  handleValidationErrors,
  authMiddleware,
  getCourtsByComplex
);

// Get a single court
courtRouter.get(
  "/:id",
  param("id")
    .notEmpty()
    .withMessage("Court ID is required")
    .isString()
    .withMessage("Court ID must be a string"),
  handleValidationErrors,
  authMiddleware,
  getCourt
);

// Create a new court
courtRouter.post(
  "/",
  body("complex_id")
    .notEmpty()
    .withMessage("Complex ID is required")
    .isString()
    .withMessage("Complex ID must be a string"),
  body("sport_id")
    .notEmpty()
    .withMessage("Sport ID is required")
    .isString()
    .withMessage("Sport ID must be a string"),
  body("name")
    .notEmpty()
    .withMessage("Name is required")
    .isString()
    .withMessage("Name must be a string"),
  body("image_url")
    .optional()
    .isString()
    .withMessage("Image URL must be a string"),
  handleValidationErrors,
  authMiddleware,
  rolMiddleware(["admin"]),
  createCourt
);

// Delete a court
courtRouter.delete(
  "/:id",
  param("id")
    .notEmpty()
    .withMessage("Court ID is required")
    .isString()
    .withMessage("Court ID must be a string"),
  handleValidationErrors,
  authMiddleware,
  rolMiddleware(["admin"]),
  deleteCourt
);

// Update an existing court
courtRouter.put(
  "/:id",
  param("id")
    .notEmpty()
    .withMessage("Court ID is required")
    .isString()
    .withMessage("Court ID must be a string"),
  body("name").optional().isString().withMessage("Name must be a string"),
  body("image_url")
    .optional()
    .isString()
    .withMessage("Image URL must be a string"),
  handleValidationErrors,
  authMiddleware,
  rolMiddleware(["admin"]),
  updateAccount
);

export default courtRouter;
