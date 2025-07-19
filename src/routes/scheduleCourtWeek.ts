import { Router } from "express";
import {
  createScheduleCourtWeek,
  getScheduleCourtWeek,
  updateScheduleCourtWeek,
  deleteScheduleCourtWeek,
  generateScheduleCourtWeek,
} from "../controllers/ScheduleCourtWeek";
import { authMiddleware, rolMiddleware } from "../middleware";

export const scheduleCourtWeekRouter = Router();

scheduleCourtWeekRouter.get(
  "/",
  authMiddleware,
  rolMiddleware(["admin"]),
  getScheduleCourtWeek
);
scheduleCourtWeekRouter.post(
  "/",
  authMiddleware,
  rolMiddleware(["admin"]),
  createScheduleCourtWeek
);
scheduleCourtWeekRouter.post(
  "/generate",
  authMiddleware,
  rolMiddleware(["admin"]),
  generateScheduleCourtWeek
);
scheduleCourtWeekRouter.put(
  "/:id",
  authMiddleware,
  rolMiddleware(["admin"]),
  updateScheduleCourtWeek
);
scheduleCourtWeekRouter.delete(
  "/:id",
  authMiddleware,
  rolMiddleware(["admin"]),
  deleteScheduleCourtWeek
);

export default scheduleCourtWeekRouter;
