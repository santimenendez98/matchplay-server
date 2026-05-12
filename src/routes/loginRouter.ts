import { Router } from "express";
import {
  loginController,
  refreshController,
  forgotPasswordController,
  resetPasswordController,
} from "../controllers/Auth";
import { body } from "express-validator";
import { handleValidationErrors } from "../middleware/validatorErrors";

const authRouter = Router();

authRouter.post(
  "/",
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Email must be a valid email"),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isString()
    .withMessage("Password must be a string"),
  handleValidationErrors,
  loginController
);

authRouter.post(
  "/refresh",
  body("refreshToken").notEmpty().isString(),
  handleValidationErrors,
  refreshController
);

authRouter.post(
  "/forgot-password",
  body("email").notEmpty().isEmail(),
  handleValidationErrors,
  forgotPasswordController
);

authRouter.post(
  "/reset-password",
  body("token").notEmpty().isString(),
  body("new_password")
    .notEmpty()
    .isString()
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters"),
  handleValidationErrors,
  resetPasswordController
);

export default authRouter;
