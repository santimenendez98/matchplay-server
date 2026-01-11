import { Router } from "express";
import { body } from "express-validator";
import { handleValidationErrors } from "../middleware/validatorErrors";
import {
  confirmTransferPayment,
  createBankTransfer,
  createCashPayment,
  createDebitPayment,
  refundPayment,
} from "../controllers/Payment";
import { authMiddleware, rolMiddleware } from "../middleware";
import { mercadoPagoWebhook, generateProof } from "../controllers/Payment";

export const paymentRouter = Router();

// Create debit payment
paymentRouter.post(
  "/pay",
  body("reservation_id")
    .notEmpty()
    .withMessage("Reservation ID is required")
    .isString()
    .withMessage("Reservation ID must be a string"),
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Email must be a valid email"),
  authMiddleware,
  rolMiddleware(["user"]),
  handleValidationErrors,
  createDebitPayment
);

// Notification webhook from MercadoPago
paymentRouter.post("/webhook", mercadoPagoWebhook);

// Create bank transfer payment
paymentRouter.post(
  "/bank-transfer",
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
  body("proof_url")
    .notEmpty()
    .withMessage("Proof URL is required")
    .isString()
    .withMessage("Proof URL must be a string"),
  authMiddleware,
  rolMiddleware(["user"]),
  handleValidationErrors,
  createBankTransfer
);

// Confirm bank transfer payment
paymentRouter.post(
  "/bank-transfer/confirm",
  body("payment_id")
    .notEmpty()
    .withMessage("Payment ID is required")
    .isString()
    .withMessage("Payment ID must be a string"),
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["completed", "failed"])
    .withMessage("Status must be either 'completed' or 'failed'"),
  authMiddleware,
  rolMiddleware(["admin"]),
  handleValidationErrors,
  confirmTransferPayment
);

// Generate Proof payment
paymentRouter.post(
  "/proof",
  body("payment_id")
    .notEmpty()
    .withMessage("Payment id is required")
    .isString()
    .withMessage("Payment id must be a string"),
  handleValidationErrors,
  authMiddleware,
  rolMiddleware(["user"]),
  generateProof
);

// Create cash payment
paymentRouter.post(
  "/cash",
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
  authMiddleware,
  rolMiddleware(["user"]),
  handleValidationErrors,
  createCashPayment
);

// Create refund
paymentRouter.post(
  "/refund",
  body("payment_id")
    .notEmpty()
    .withMessage("Payment ID is required")
    .isString()
    .withMessage("Payment ID must be a string"),
  body("proof_refund")
    .notEmpty()
    .withMessage("Proof of refund is required")
    .isString()
    .withMessage("Proof of refund must be a string"),
  body("refund_status")
    .notEmpty()
    .withMessage("Refund status is required")
    .isIn(["completed", "failed"])
    .withMessage("Refund status must be either 'completed' or 'failed'"),
  body("refunded_by")
    .notEmpty()
    .withMessage("Refunded by is required")
    .isString()
    .withMessage("Refunded by must be a string"),
  authMiddleware,
  rolMiddleware(["admin"]),
  handleValidationErrors,
  refundPayment
);

export default paymentRouter;
