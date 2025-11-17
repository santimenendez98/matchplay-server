import { Router } from "express";
import {
  getMatches,
  joinMatch,
  leaveMatch,
  sendMessageToMatch,
  historyChatMatch,
  getMatchByCourt,
} from "../controllers/Match";
import { authMiddleware, rolMiddleware } from "../middleware";
import { body, param } from "express-validator";
import { handleValidationErrors } from "../middleware/validatorErrors";

export const matchRouter = Router();

// Get all matches
matchRouter.get("/", authMiddleware, getMatches);

// Get match per complex
matchRouter.get(
  "/:id",
  param("id")
    .notEmpty()
    .withMessage("Match ID is required")
    .isString()
    .withMessage("Match ID must be a string"),
  authMiddleware,
  getMatchByCourt
);

// Join a match
matchRouter.post(
  "/join",
  body("match_id")
    .notEmpty()
    .withMessage("Match ID is required")
    .isString()
    .withMessage("Match ID must be a string"),
  body("player_id")
    .notEmpty()
    .withMessage("Player ID is required")
    .isString()
    .withMessage("Player ID must be a string"),
  handleValidationErrors,
  authMiddleware,
  rolMiddleware(["user"]),
  joinMatch
);

// Leave a match
matchRouter.post(
  "/leave",
  body("match_id")
    .notEmpty()
    .withMessage("Match ID is required")
    .isString()
    .withMessage("Match ID must be a string"),
  body("player_id")
    .notEmpty()
    .withMessage("Player ID is required")
    .isString()
    .withMessage("Player ID must be a string"),
  handleValidationErrors,
  authMiddleware,
  rolMiddleware(["user"]),
  leaveMatch
);

// Send a message to a match
matchRouter.post(
  "/message",
  body("match_id")
    .notEmpty()
    .withMessage("Match ID is required")
    .isString()
    .withMessage("Match ID must be a string"),
  body("player_id")
    .notEmpty()
    .withMessage("Player ID is required")
    .isString()
    .withMessage("Player ID must be a string"),
  body("message")
    .notEmpty()
    .withMessage("Message is required")
    .isString()
    .withMessage("Message must be a string"),
  handleValidationErrors,
  authMiddleware,
  sendMessageToMatch
);

// History chat for a match
matchRouter.get(
  "/message/history/:id",
  param("id")
    .notEmpty()
    .withMessage("Match ID is required")
    .isString()
    .withMessage("Match ID must be a string"),
  handleValidationErrors,
  authMiddleware,
  rolMiddleware(["admin"]),
  historyChatMatch
);

// Get players for a match

export default matchRouter;
