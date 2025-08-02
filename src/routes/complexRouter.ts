import { Router } from "express";
import {
  getComplexData,
  createComplexData,
  deleteComplexData,
  updateComplexData,
} from "../controllers/Complex";
import { authMiddleware, rolMiddleware } from "../middleware";
import { body, param } from "express-validator";
import { handleValidationErrors } from "../middleware/validatorErrors";

export const complexRouter = Router();

// Get all complex
complexRouter.get("/", authMiddleware, getComplexData);

// Create a new complex(ONLY ACCESSIBLE BY APP CREATOR)
complexRouter.post(
  "/",
  body("admin_id")
    .notEmpty()
    .withMessage("Admin ID is required")
    .isString()
    .withMessage("Admin ID must be a string"),
  body("name")
    .notEmpty()
    .withMessage("Name is required")
    .isString()
    .withMessage("Name must be a string"),
  body("location")
    .notEmpty()
    .withMessage("Location is required")
    .isString()
    .withMessage("Location must be a string"),
  body("description")
    .notEmpty()
    .withMessage("Description is required")
    .isString()
    .withMessage("Description must be a string"),
  body("image_url")
    .optional()
    .isString()
    .withMessage("Image URL must be a string"),
  handleValidationErrors,
  authMiddleware,
  rolMiddleware(["admin"]),
  createComplexData
);

// Update a complex
complexRouter.put(
  "/:id",
  param("id")
    .notEmpty()
    .withMessage("Complex ID is required")
    .isString()
    .withMessage("Complex ID must be a string"),
  body("admin_id")
    .optional()
    .isString()
    .withMessage("Admin ID must be a string"),
  body("name").optional().isString().withMessage("Name must be a string"),
  body("location")
    .optional()
    .isString()
    .withMessage("Location must be a string"),
  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string"),
  body("image_url")
    .optional()
    .isString()
    .withMessage("Image URL must be a string"),
  handleValidationErrors,
  authMiddleware,
  rolMiddleware(["admin"]),
  updateComplexData
);

// Delete a complex(ONLY ACCESIBLE BY APP CREATOR)
complexRouter.delete(
  "/:id",
  param("id")
    .notEmpty()
    .withMessage("Complex ID is required")
    .isString()
    .withMessage("Complex ID must be a string"),
  handleValidationErrors,
  authMiddleware,
  rolMiddleware(["admin"]),
  deleteComplexData
);

export default complexRouter;
