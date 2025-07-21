import { Router } from "express";
import {
  createScheduleCourtWeek,
  getScheduleCourtWeek,
  updateScheduleCourtWeek,
  deleteScheduleCourtWeek,
  generateScheduleCourtWeek,
} from "../controllers/ScheduleCourtWeek";
import {
  getScheduleWeekPrice,
  createScheduleWeekPrice,
  updateScheduleWeekPrice,
  deleteScheduleWeekPrice,
} from "../controllers/ScheduleWeekPrice";
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
scheduleCourtWeekRouter.post(
  "/generate",
  authMiddleware,
  rolMiddleware(["admin"]),
  generateScheduleCourtWeek
);
scheduleCourtWeekRouter.get("/price", authMiddleware, getScheduleWeekPrice);
scheduleCourtWeekRouter.post(
  "/price",
  authMiddleware,
  rolMiddleware(["admin"]),
  createScheduleWeekPrice
);
scheduleCourtWeekRouter.put(
  "/price/:id",
  authMiddleware,
  rolMiddleware(["admin"]),
  updateScheduleWeekPrice
);
scheduleCourtWeekRouter.delete(
  "/price/:id",
  authMiddleware,
  rolMiddleware(["admin"]),
  deleteScheduleWeekPrice
);

export default scheduleCourtWeekRouter;
