import { Router } from "express";
import {
  getScheduleDay,
  createScheduleDay,
  deleteScheduleDay,
  updateScheduleDay,
} from "../controllers/ScheduleDay";
import {
  getScheduleDayPrice,
  createScheduleDayPrice,
  updateScheduleDayPrice,
  deleteScheduleDayPrice,
} from "../controllers/ScheduleDayPrice";
import { authMiddleware, rolMiddleware } from "../middleware";

export const scheduleDayRouter = Router();

scheduleDayRouter.get("/", getScheduleDay);
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
scheduleDayRouter.get("/price", authMiddleware, getScheduleDayPrice);
scheduleDayRouter.post(
  "/price",
  authMiddleware,
  rolMiddleware(["admin"]),
  createScheduleDayPrice
);
scheduleDayRouter.put(
  "/price/:id",
  authMiddleware,
  rolMiddleware(["admin"]),
  updateScheduleDayPrice
);
scheduleDayRouter.delete(
  "/price/:id",
  authMiddleware,
  rolMiddleware(["admin"]),
  deleteScheduleDayPrice
);

export default scheduleDayRouter;
