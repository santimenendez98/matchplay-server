// src/services/scheduleService.ts
import pool from "../db";
import { getDay } from "date-fns";

export const generateScheduleForDay = async (date: Date) => {
  const dayOfWeek = getDay(date);

  const plantilla = await pool.query(
    `SELECT * FROM WeekScheduleCourt WHERE day_of_week = $1`,
    [dayOfWeek]
  );

  for (const row of plantilla.rows) {
    const exists = await pool.query(
      `SELECT id FROM ScheduleCourt WHERE court_id = $1 AND schedule_date = $2 AND schedule_time = $3`,
      [row.court_id, date.toISOString().split("T")[0], row.schedule_time]
    );

    if (exists.rowCount === 0) {
      await pool.query(
        `INSERT INTO ScheduleCourt (court_id, schedule_date, schedule_time, is_available)
         VALUES ($1, $2, $3, TRUE)`,
        [row.court_id, date.toISOString().split("T")[0], row.schedule_time]
      );
    }
  }
};

export default generateScheduleForDay;
