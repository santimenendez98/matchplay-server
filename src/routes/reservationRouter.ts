import { Router } from "express";
import {
  getReservations,
  createReservation,
  cancelReservation,
  cancelReservationRequest,
  cancelPreReservation,
} from "../controllers/Reservation";
import { authMiddleware, rolMiddleware } from "../middleware";
import { body } from "express-validator";
import { handleValidationErrors } from "../middleware/validatorErrors";
import { paymentReservationWithCard } from "../controllers/Payment";

export const reservationRouter = Router();

//Get request
reservationRouter.get("/", authMiddleware, getReservations);

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

// Pay for a reservation
reservationRouter.post(
  "/pay",
  body("reservation_id")
    .notEmpty()
    .withMessage("Reservation ID is required")
    .isString()
    .withMessage("Reservation ID must be a string"),
  body("account_id")
    .notEmpty()
    .withMessage("Account ID is required")
    .isString()
    .withMessage("Account ID must be a string"),
  body("paid_by").isString().withMessage("Paid by must be a string"),
  body("payment_data.card_number")
    .notEmpty()
    .withMessage("Card number is required")
    .isString()
    .withMessage("Card number must be a string"),
  body("payment_data.expiration_month")
    .notEmpty()
    .withMessage("Expiration month is required")
    .isNumeric()
    .withMessage("Expiration month must be a number"),
  body("payment_data.expiration_year")
    .notEmpty()
    .withMessage("Expiration year is required")
    .isNumeric()
    .withMessage("Expiration year must be a number"),
  body("payment_data.security_code")
    .notEmpty()
    .withMessage("Security code is required")
    .isString()
    .withMessage("Security code must be a string"),
  body("payment_data.cardholder.name")
    .notEmpty()
    .withMessage("Cardholder name is required")
    .isString()
    .withMessage("Cardholder name must be a string"),
  body("payment_data.cardholder.identification.type")
    .notEmpty()
    .withMessage("Cardholder identification type is required")
    .isString()
    .withMessage("Cardholder identification type must be a string"),
  body("payment_data.cardholder.identification.number")
    .notEmpty()
    .withMessage("Cardholder identification number is required")
    .isString()
    .withMessage("Cardholder identification number must be a string"),
  paymentReservationWithCard
);

export default reservationRouter;
