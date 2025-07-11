import { Router } from "express";
import loginController from "../controllers/Auth";

const authRouter = Router();

authRouter.post("/", loginController);

export default authRouter;
