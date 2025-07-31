import cron from "node-cron";
import { addDays } from "date-fns";
import { generateScheduleForDay } from "../services/scheduleService";
import { getCurrentTime } from "../services/addMinutes";
import { checkScheduleStausQuery } from "../db/ScheduleCourtQueries";

export const startScheduleCronJob = () => {
  cron.schedule("0 0 * * *", async () => {
    try {
      const today = getCurrentTime();
      const targetDate = addDays(today, 6);
      await generateScheduleForDay(targetDate);
    } catch (error) {
      console.error("Error to generate: ", error);
    }
  });
};

export const checkScheduleCronJob = () => {
  cron.schedule("0,30 * * * *", async () => {
    try {
      const today = getCurrentTime();
      await checkScheduleStausQuery(today);
      console.log("Checked schedule status at:", today);
    } catch (error) {
      console.error("Error checking schedule status:", error);
    }
  });
};

export default {
  startScheduleCronJob,
  checkScheduleCronJob,
};
