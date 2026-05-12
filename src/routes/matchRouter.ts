import { Router } from "express";
import {
  getMatches,
  getMatchById,
  getMatchPlayers,
  getMatchesByPlayer,
  joinMatch,
  leaveMatch,
  sendMessageToMatch,
  historyChatMatch,
} from "../controllers/Match";
import { authMiddleware, rolMiddleware } from "../middleware";
import { body, param } from "express-validator";
import { handleValidationErrors } from "../middleware/validatorErrors";

export const matchRouter = Router();

// Get all matches
matchRouter.get("/", authMiddleware, getMatches);

// Get matches for a specific player ("me" for the authenticated user)
matchRouter.get(
  "/player/:playerId",
  param("playerId")
    .notEmpty()
    .withMessage("Player ID is required")
    .isString()
    .withMessage("Player ID must be a string"),
  handleValidationErrors,
  authMiddleware,
  getMatchesByPlayer
);

// Get a single match by id
matchRouter.get(
  "/:id",
  param("id")
    .notEmpty()
    .withMessage("Match ID is required")
    .isString()
    .withMessage("Match ID must be a string"),
  handleValidationErrors,
  authMiddleware,
  getMatchById
);

// Get the list of players joined to a match
matchRouter.get(
  "/:id/players",
  param("id")
    .notEmpty()
    .withMessage("Match ID is required")
    .isString()
    .withMessage("Match ID must be a string"),
  handleValidationErrors,
  authMiddleware,
  getMatchPlayers
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
  historyChatMatch
);

export default matchRouter;
