import { Router } from "express";
import {
  getReservations,
  getReservationById,
  getReservationsByAccount,
  createReservation,
  cancelReservation,
  cancelReservationRequest,
  cancelPreReservation,
} from "../controllers/Reservation";
import { authMiddleware, rolMiddleware } from "../middleware";
import { body, param } from "express-validator";
import { handleValidationErrors } from "../middleware/validatorErrors";

export const reservationRouter = Router();

//Get all reservations (admin/creator only)
reservationRouter.get(
  "/",
  authMiddleware,
  rolMiddleware(["admin", "creator"]),
  getReservations
);

//Get reservations for a specific account (or "me" for the authenticated user)
reservationRouter.get(
  "/account/:accountId",
  param("accountId")
    .notEmpty()
    .withMessage("Account ID is required")
    .isString()
    .withMessage("Account ID must be a string"),
  handleValidationErrors,
  authMiddleware,
  getReservationsByAccount
);

//Get a single reservation by id
reservationRouter.get(
  "/:id",
  param("id")
    .notEmpty()
    .withMessage("Reservation ID is required")
    .isString()
    .withMessage("Reservation ID must be a string"),
  handleValidationErrors,
  authMiddleware,
  getReservationById
);

//Create a reservation
reservationRouter.post(
  "/",
  body("schedule_id")
    .notEmpty()
    .withMessage("Schedule ID is required")
    .isString()
    .withMessage("Schedule ID must be a string"),
  body("account_id")
    .notEmpty()
    .withMessage("Account ID is required")
    .isString()
    .withMessage("Account ID must be a string"),
  body("time_reserved")
    .notEmpty()
    .withMessage("Time reserved is required")
    .isNumeric()
    .withMessage("Time reserved must be a number"),
  body("is_match")
    .notEmpty()
    .withMessage("Is match is required")
    .isBoolean()
    .withMessage("Is match must be a boolean"),
  handleValidationErrors,
  authMiddleware,
  rolMiddleware(["user"]),
  createReservation
);

//Request to cancel a reservation
reservationRouter.post(
  "/cancelrequest",
  body("reservation_id")
    .notEmpty()
    .withMessage("Reservation ID is required")
    .isString()
    .withMessage("Reservation ID must be a string"),
  body("requested_by")
    .notEmpty()
    .withMessage("Requested by is required")
    .isString()
    .withMessage("Requested by must be a string"),
  body("reason")
    .notEmpty()
    .withMessage("Reason is required")
    .isString()
    .withMessage("Reason must be a string"),
  handleValidationErrors,
  authMiddleware,
  rolMiddleware(["user"]),
  cancelReservationRequest
);

//Cancel a reservation
reservationRouter.post(
  "/cancelreservation",
  body("reservation_id")
    .notEmpty()
    .withMessage("Reservation ID is required")
    .isString()
    .withMessage("Reservation ID must be a string"),
  body("canceled_by")
    .notEmpty()
    .withMessage("Canceled by is required")
    .isString()
    .withMessage("Canceled by must be a string"),
  handleValidationErrors,
  authMiddleware,
  rolMiddleware(["admin"]),
  cancelReservation
);

//Cancel a pre-reservation
reservationRouter.post(
  "/cancelprereservation",
  body("reservation_id")
    .notEmpty()
    .withMessage("Reservation ID is required")
    .isString()
    .withMessage("Reservation ID must be a string"),
  body("canceled_by")
    .notEmpty()
    .withMessage("Canceled by is required")
    .isString()
    .withMessage("Canceled by must be a string"),
  handleValidationErrors,
  authMiddleware,
  cancelPreReservation
);

export default reservationRouter;
