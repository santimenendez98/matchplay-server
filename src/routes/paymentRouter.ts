import { Router } from "express";
import { body, param } from "express-validator";
import { handleValidationErrors } from "../middleware/validatorErrors";
import {
  confirmTransferPayment,
  createBankTransfer,
  createCashPayment,
  createCheckoutPreference,
  generateProof,
  getPaymentById,
  getPayments,
  getPaymentsByAccount,
  getPaymentsByReservation,
  mercadoPagoWebhook,
  refundPayment,
  signCloudinaryUpload,
} from "../controllers/Payment";
import { authMiddleware, rolMiddleware } from "../middleware";

export const paymentRouter = Router();

// List all payments (admin/creator only)
paymentRouter.get(
  "/",
  authMiddleware,
  rolMiddleware(["admin", "creator"]),
  getPayments
);

// Build a signed Cloudinary upload payload so the frontend can upload
// proofs of payment without exposing the API secret.
paymentRouter.get(
  "/upload/sign",
  authMiddleware,
  signCloudinaryUpload
);

// List payments for an account (use "me" for the authenticated user)
paymentRouter.get(
  "/account/:accountId",
  param("accountId")
    .notEmpty()
    .withMessage("Account ID is required")
    .isString()
    .withMessage("Account ID must be a string"),
  handleValidationErrors,
  authMiddleware,
  getPaymentsByAccount
);

// List payments for a reservation (admins)
paymentRouter.get(
  "/reservation/:id",
  param("id")
    .notEmpty()
    .withMessage("Reservation ID is required")
    .isString()
    .withMessage("Reservation ID must be a string"),
  handleValidationErrors,
  authMiddleware,
  rolMiddleware(["admin", "creator"]),
  getPaymentsByReservation
);

// Get a single payment by id (admin/creator)
paymentRouter.get(
  "/:id",
  param("id")
    .notEmpty()
    .withMessage("Payment ID is required")
    .isString()
    .withMessage("Payment ID must be a string"),
  handleValidationErrors,
  authMiddleware,
  rolMiddleware(["admin", "creator"]),
  getPaymentById
);

// Create MercadoPago Checkout Pro preference for a reservation.
// Frontend sends { reservation_id, email } and receives an init_point URL
// to redirect the user to MercadoPago's hosted checkout.
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
  handleValidationErrors,
  authMiddleware,
  rolMiddleware(["user"]),
  createCheckoutPreference
);

// MercadoPago webhook (public). Signature is verified inside the handler
// using MERCADO_PAGO_WEBHOOK_SECRET.
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
  handleValidationErrors,
  authMiddleware,
  rolMiddleware(["user"]),
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
  handleValidationErrors,
  authMiddleware,
  rolMiddleware(["admin"]),
  confirmTransferPayment
);

// Generate Proof payment
paymentRouter.post(
  "/proof",
  body("mp_payment_id")
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
  handleValidationErrors,
  authMiddleware,
  rolMiddleware(["user"]),
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
  handleValidationErrors,
  authMiddleware,
  rolMiddleware(["admin"]),
  refundPayment
);

export default paymentRouter;
