import { Router } from "express";
import accountRouter from "./accountRouter";
import authRouter from "./loginRouter";
import complexRouter from "./complexRouter";

export const router = Router();

router.use("/account", accountRouter);
router.use("/auth", authRouter);
router.use("/complex", complexRouter);

export default router;
