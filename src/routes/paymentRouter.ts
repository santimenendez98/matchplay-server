import { Router } from "express";
import { body } from "express-validator";
import { handleValidationErrors } from "../middleware/validatorErrors";
import { createDebitPayment, generateProof } from "../controllers/MercadoPago";

export const paymentRouter = Router();

paymentRouter.post(
  "/pay",
  body("reservation_id")
    .notEmpty()
    .withMessage("Reservation ID is required")
    .isString()
    .withMessage("Reservation ID must be a string"),
  body("amount")
    .notEmpty()
    .withMessage("Amount is required")
    .isNumeric()
    .withMessage("Amount must be a number"),
  body("payment_method_id")
    .notEmpty()
    .withMessage("Payment method ID is required")
    .isString()
    .withMessage("Payment method ID must be a string"),
  body("token")
    .notEmpty()
    .withMessage("Token is required")
    .isString()
    .withMessage("Token must be a string"),
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Email must be a valid email"),
  body("identification_type")
    .notEmpty()
    .withMessage("Identification type is required")
    .isString()
    .withMessage("Identification type must be a string"),
  body("identification_number")
    .notEmpty()
    .withMessage("Identification number is required")
    .isString()
    .withMessage("Identification number must be a string"),
  handleValidationErrors,
  createDebitPayment
);

paymentRouter.post(
  "/proof",
  body("mp_payment_id")
    .notEmpty()
    .withMessage("Payment id is required")
    .isString()
    .withMessage("Payment id must be a string"),
  handleValidationErrors,
  generateProof
);

export default paymentRouter;
