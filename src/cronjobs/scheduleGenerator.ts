import cron from "node-cron";
import { addDays } from "date-fns";
import { generateScheduleForDay } from "../services/scheduleService";
import { getCurrentTime } from "../services/addMinutes";
import { checkScheduleStausQuery } from "../db/ScheduleCourtQueries";
import logger from "../services/logger";

// Core implementations callable from cron or HTTP.
export const runGenerateUpcomingSchedule = async () => {
  const today = getCurrentTime();
  const targetDate = addDays(today, 6);
  await generateScheduleForDay(targetDate);
  return { generatedFor: targetDate.toISOString().split("T")[0] };
};

export const runCheckScheduleStatus = async () => {
  const today = getCurrentTime();
  await checkScheduleStausQuery(today);
  logger.info({ today }, "Checked schedule status");
  return { checkedAt: today };
};

export const startScheduleCronJob = () => {
  cron.schedule("0 0 * * *", async () => {
    try {
      await runGenerateUpcomingSchedule();
    } catch (error) {
      logger.error({ err: (error as Error).message }, "Error generating schedule");
    }
  });
};

export const checkScheduleCronJob = async () => {
  try {
    await runCheckScheduleStatus();
  } catch (error) {
    logger.error(
      { err: (error as Error).message },
      "Error checking schedule status"
    );
  }
  cron.schedule("0,30 * * * *", async () => {
    try {
      await runCheckScheduleStatus();
    } catch (error) {
      logger.error(
        { err: (error as Error).message },
        "Error checking schedule status"
      );
    }
  });
};

export default {
  startScheduleCronJob,
  checkScheduleCronJob,
  runGenerateUpcomingSchedule,
  runCheckScheduleStatus,
};
