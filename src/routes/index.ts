import { Router } from "express";
import accountRouter from "./accountRouter";

export const router = Router();

router.use("/account", accountRouter);

export default router;
