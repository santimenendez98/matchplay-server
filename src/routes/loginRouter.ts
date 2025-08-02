import { Router } from "express";
import loginController from "../controllers/Auth";
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

export default authRouter;
