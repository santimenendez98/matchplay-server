import { Router } from "express";
import { getSports, createSport, deleteSport } from "../controllers/Sport";
import { authMiddleware, rolMiddleware } from "../middleware";
import { body, param } from "express-validator";
import { handleValidationErrors } from "../middleware/validatorErrors";

export const sportRouter = Router();

// Get all sports
sportRouter.get("/", authMiddleware, getSports);

// Create a new sport(ONLY ACCESSIBLE BY APP CREATOR)
sportRouter.post(
  "/",
  body("name")
    .notEmpty()
    .withMessage("Name is required")
    .isString()
    .withMessage("Name must be a string"),
  body("max_players")
    .notEmpty()
    .withMessage("Max players is required")
    .isNumeric()
    .withMessage("Max players must be a number"),
  handleValidationErrors,
  authMiddleware,
  rolMiddleware(["creator"]),
  createSport
);

// Delete a sport(ONLY ACCESSIBLE BY APP CREATOR)
sportRouter.delete(
  "/:id",
  param("id")
    .notEmpty()
    .withMessage("ID is required")
    .isString()
    .withMessage("ID must be a string"),
  handleValidationErrors,
  authMiddleware,
  rolMiddleware(["creator"]),
  deleteSport
);

export default sportRouter;
