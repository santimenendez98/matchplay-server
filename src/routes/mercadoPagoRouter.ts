import { Router } from "express";
import {
  savePaymentMethod,
  addCustomer,
  generateToken,
} from "../controllers/MercadoPago";
import { body } from "express-validator";

export const mercadoPagoRouter = Router();

// Add a new customer
mercadoPagoRouter.post(
  "/add-customer",
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format"),
  addCustomer
);

// Save payment method
mercadoPagoRouter.post(
  "/save-payment",
  body("token")
    .notEmpty()
    .withMessage("Token is required")
    .isString()
    .withMessage("Token must be a string"),
  body("customerId")
    .notEmpty()
    .withMessage("Customer ID is required")
    .isString()
    .withMessage("Customer ID must be a string"),
  savePaymentMethod
);

// Generate token
mercadoPagoRouter.post(
  "/generate-token",
  body("card_number")
    .notEmpty()
    .withMessage("Card number is required")
    .isString()
    .withMessage("Card number must be a string"),
  body("expiration_month")
    .notEmpty()
    .withMessage("Expiration month is required")
    .isNumeric()
    .withMessage("Expiration month must be a number"),
  body("expiration_year")
    .notEmpty()
    .withMessage("Expiration year is required")
    .isNumeric()
    .withMessage("Expiration year must be a number"),
  body("security_code")
    .notEmpty()
    .withMessage("Security code is required")
    .isString()
    .withMessage("Security code must be a string"),
  body("cardholder.name")
    .notEmpty()
    .withMessage("Cardholder name is required")
    .isString()
    .withMessage("Cardholder name must be a string"),
  body("cardholder.identification.type")
    .notEmpty()
    .withMessage("Cardholder identification type is required")
    .isString()
    .withMessage("Cardholder identification type must be a string"),
  body("cardholder.identification.number")
    .notEmpty()
    .withMessage("Cardholder identification number is required")
    .isString()
    .withMessage("Cardholder identification number must be a string"),
  generateToken
);

export default mercadoPagoRouter;
