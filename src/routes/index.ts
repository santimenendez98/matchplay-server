import { Router } from "express";
import accountRouter from "./accountRouter";
import authRouter from "./loginRouter";
import complexRouter from "./complexRouter";
import courtRouter from "./courterRouter";
import sportRouter from "./sportRouter";
import scheduleDayRouter from "./scheduleDay";
import scheduleCourtWeekRouter from "./scheduleCourtWeek";
import reservationRouter from "./reservationRouter";

export const router = Router();

router.use("/account", accountRouter);
router.use("/auth", authRouter);
router.use("/complex", complexRouter);
router.use("/court", courtRouter);
router.use("/sport", sportRouter);
router.use("/scheduleday", scheduleDayRouter);
router.use("/schedulecourtweek", scheduleCourtWeekRouter);
router.use("/reservation", reservationRouter);

export default router;
