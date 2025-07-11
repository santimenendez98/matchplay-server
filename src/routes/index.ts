import { Router } from "express";
import accountRouter from "./accountRouter";
import authRouter from "./loginRouter";

export const router = Router();

router.use("/account", accountRouter);
router.use("/auth", authRouter);

export default router;
