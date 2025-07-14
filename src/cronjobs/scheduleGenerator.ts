import cron from "node-cron";
import { addDays, format } from "date-fns";
import { generateScheduleForDay } from "../services/scheduleService";

export const startScheduleCronJob = () => {
  cron.schedule("0 0 * * *", async () => {
    try {
      const today = new Date();
      const targetDate = addDays(today, 6);
      await generateScheduleForDay(targetDate);
    } catch (error) {
      console.error("Error to generate: ", error);
    }
  });
};

export default {
  startScheduleCronJob,
};
