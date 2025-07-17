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
      `SELECT id FROM ScheduleCourt WHERE court_id = $1 AND schedule_date = $2 AND start_time = $3 AND end_time = $4 AND price = $5`,
      [
        row.court_id,
        date.toISOString().split("T")[0],
        row.start_time,
        row.end_time,
        row.price,
      ]
    );

    if (exists.rowCount === 0) {
      await pool.query(
        `INSERT INTO ScheduleCourt (court_id, schedule_date, start_time, end_time, price, is_available)
         VALUES ($1, $2, $3, $4, $5, TRUE)`,
        [
          row.court_id,
          date.toISOString().split("T")[0],
          row.start_time,
          row.end_time,
          row.price,
        ]
      );
    }
  }
};

export default generateScheduleForDay;
