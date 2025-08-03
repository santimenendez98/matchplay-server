import { Router } from "express";
import {
  getAccounts,
  updateAccount,
  deleteAccount,
  createAccount,
  getAccountById,
} from "../controllers/Account";
import { authMiddleware, rolMiddleware } from "../middleware";
import { body, param } from "express-validator";
import { handleValidationErrors } from "../middleware/validatorErrors";

export const accountRouter = Router();

// Get all accounts(ONLY ACCESSIBLE BY APP CREATOR)
accountRouter.get("/", authMiddleware, getAccounts);

// Get account by id(ONLY ACCESSIBLE BY APP CREATOR)
accountRouter.get(
  "/:id",
  param("id")
    .isEmpty()
    .withMessage("ID must be empty")
    .isString()
    .withMessage("ID must be a string"),
  handleValidationErrors,
  authMiddleware,
  getAccountById
);

// Update an existing account
accountRouter.put(
  "/:id",
  body("name").optional().isString().withMessage("Name must be a string"),
  body("email").optional().isEmail().withMessage("Email must be a valid email"),
  body("birthdate")
    .optional()
    .isISO8601()
    .withMessage("Birthdate must be a valid date (yyyy-mm-dd)"),
  body("phone").optional().isString().withMessage("Phone must be a string"),
  handleValidationErrors,
  authMiddleware,
  rolMiddleware(["user"]),
  updateAccount
);

// Delete an account
accountRouter.delete(
  "/:id",
  param("id")
    .isEmpty()
    .withMessage("ID must be empty")
    .isString()
    .withMessage("ID must be a string"),
  handleValidationErrors,
  authMiddleware,
  rolMiddleware(["user"]),
  deleteAccount
);

// Create a new account
accountRouter.post(
  "/",
  body("name").isString().withMessage("Name must be a string"),
  body("email").isEmail().withMessage("Email must be a valid email"),
  body("password").isString().withMessage("Password must be a string"),
  body("birthdate")
    .isISO8601()
    .withMessage("Birthdate must be a valid date (yyyy-mm-dd)"),
  body("phone").isString().withMessage("Phone must be a string"),
  body("account_type").isString().withMessage("Account type must be a string"),
  handleValidationErrors,
  createAccount
);

export default accountRouter;
