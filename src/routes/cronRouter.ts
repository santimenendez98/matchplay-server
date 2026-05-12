// Cron endpoints triggered by an external scheduler (Vercel Cron, GitHub
// Actions, etc.). Protected by a shared secret in `Authorization: Bearer`.

import { Router } from "express";
import { Request, Response, NextFunction } from "express";
import {
  runCheckScheduleStatus,
  runGenerateUpcomingSchedule,
} from "../cronjobs/scheduleGenerator";
import { runExpiredPreReservesJob } from "../cronjobs/preReserveCronJob";
import logger from "../services/logger";

export const cronRouter = Router();

const cronAuth = (req: Request, res: Response, next: NextFunction) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return res.status(503).json({
      message: "Cron is not configured",
      error: "CRON_SECRET is not set",
    });
  }
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${secret}`) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

cronRouter.post("/expired-pre-reserves", cronAuth, async (_req, res) => {
  try {
    const result = await runExpiredPreReservesJob();
    res.status(200).json({ message: "ok", data: result });
  } catch (error) {
    logger.error(
      { err: (error as Error).message },
      "cron: expired-pre-reserves failed"
    );
    res.status(500).json({
      message: "An error occurred",
      error: (error as Error).message,
    });
  }
});

cronRouter.post("/generate-schedule", cronAuth, async (_req, res) => {
  try {
    const result = await runGenerateUpcomingSchedule();
    res.status(200).json({ message: "ok", data: result });
  } catch (error) {
    logger.error(
      { err: (error as Error).message },
      "cron: generate-schedule failed"
    );
    res.status(500).json({
      message: "An error occurred",
      error: (error as Error).message,
    });
  }
});

cronRouter.post("/check-schedule-status", cronAuth, async (_req, res) => {
  try {
    const result = await runCheckScheduleStatus();
    res.status(200).json({ message: "ok", data: result });
  } catch (error) {
    logger.error(
      { err: (error as Error).message },
      "cron: check-schedule-status failed"
    );
    res.status(500).json({
      message: "An error occurred",
      error: (error as Error).message,
    });
  }
});

export default cronRouter;
