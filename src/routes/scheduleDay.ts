import { Router } from "express";
import {
  getScheduleDay,
  createScheduleDay,
  deleteScheduleDay,
  updateScheduleDay,
} from "../controllers/ScheduleDay";

import { authMiddleware, rolMiddleware } from "../middleware";

export const scheduleDayRouter = Router();

scheduleDayRouter.get("/", authMiddleware, getScheduleDay);
scheduleDayRouter.post(
  "/",
  authMiddleware,
  rolMiddleware(["admin"]),
  createScheduleDay
);
scheduleDayRouter.put(
  "/:id",
  authMiddleware,
  rolMiddleware(["admin"]),
  updateScheduleDay
);
scheduleDayRouter.delete(
  "/:id",
  authMiddleware,
  rolMiddleware(["admin"]),
  deleteScheduleDay
);

export default scheduleDayRouter;
