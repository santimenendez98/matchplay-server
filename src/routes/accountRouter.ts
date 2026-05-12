import { Router } from "express";
import {
  getAccounts,
  updateAccount,
  deleteAccount,
  createAccount,
  createAdminAccount,
  changePassword,
  getAccountById,
} from "../controllers/Account";
import { authMiddleware, rolMiddleware } from "../middleware";
import { body, param } from "express-validator";
import { handleValidationErrors } from "../middleware/validatorErrors";

export const accountRouter = Router();

// Public signup (always creates "user" accounts)
accountRouter.post(
  "/",
  body("name")
    .notEmpty()
    .withMessage("Name is required")
    .isString()
    .withMessage("Name must be a string"),
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Email must be a valid email"),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isString()
    .withMessage("Password must be a string")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
  body("birthdate")
    .notEmpty()
    .withMessage("Birthdate is required")
    .isISO8601()
    .withMessage("Birthdate must be a valid date (yyyy-mm-dd)"),
  body("phone")
    .notEmpty()
    .withMessage("Phone is required")
    .isString()
    .withMessage("Phone must be a string"),
  handleValidationErrors,
  createAccount
);

// Admin account creation (creator only)
accountRouter.post(
  "/admin",
  body("name").notEmpty().isString(),
  body("email").notEmpty().isEmail(),
  body("password").notEmpty().isString().isLength({ min: 8 }),
  body("birthdate").notEmpty().isISO8601(),
  body("phone").notEmpty().isString(),
  handleValidationErrors,
  authMiddleware,
  rolMiddleware(["creator"]),
  createAdminAccount
);

// Change own password
accountRouter.patch(
  "/me/password",
  body("current_password")
    .notEmpty()
    .withMessage("Current password is required")
    .isString(),
  body("new_password")
    .notEmpty()
    .withMessage("New password is required")
    .isString()
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters"),
  handleValidationErrors,
  authMiddleware,
  changePassword
);

// Get all accounts (creator only)
accountRouter.get("/", authMiddleware, rolMiddleware(["creator"]), getAccounts);

// Get account by id (creator only)
accountRouter.get(
  "/:id",
  param("id")
    .notEmpty()
    .withMessage("ID is required")
    .isString()
    .withMessage("ID must be a string"),
  handleValidationErrors,
  authMiddleware,
  rolMiddleware(["creator"]),
  getAccountById
);

// Update an existing account
accountRouter.put(
  "/:id",
  param("id").notEmpty().isString(),
  body("name").optional().isString().withMessage("Name must be a string"),
  body("email").optional().isEmail().withMessage("Email must be a valid email"),
  body("birthdate")
    .optional()
    .isISO8601()
    .withMessage("Birthdate must be a valid date (yyyy-mm-dd)"),
  body("phone").optional().isString().withMessage("Phone must be a string"),
  handleValidationErrors,
  authMiddleware,
  rolMiddleware(["user", "admin"]),
  updateAccount
);

// Delete an account
accountRouter.delete(
  "/:id",
  param("id")
    .notEmpty()
    .withMessage("ID is required")
    .isString()
    .withMessage("ID must be a string"),
  handleValidationErrors,
  authMiddleware,
  rolMiddleware(["user", "admin"]),
  deleteAccount
);

export default accountRouter;
