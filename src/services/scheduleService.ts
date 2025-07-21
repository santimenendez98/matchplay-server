import pool from "../db/connection";
import { getDay } from "date-fns";
import { createDayPriceQuery } from "../db/ScheduleDayPrIceQueries";

export const generateScheduleForDay = async (date: Date) => {
  const dayOfWeek = getDay(date);

  const plantilla = await pool.query(
    `SELECT * FROM WeekScheduleCourt WHERE day_of_week = $1`,
    [dayOfWeek]
  );

  for (const row of plantilla.rows) {
    const exists = await pool.query(
      `SELECT id FROM ScheduleCourt WHERE court_id = $1 AND schedule_date = $2 AND start_time = $3 AND end_time = $4`,
      [
        row.court_id,
        date.toISOString().split("T")[0],
        row.start_time,
        row.end_time,
      ]
    );

    if (exists.rowCount === 0) {
      // Create a new schedule for the court on the specified date
      const newSchedule = await pool.query(
        `INSERT INTO ScheduleCourt (court_id, schedule_date, start_time, end_time, is_available)
         VALUES ($1, $2, $3, $4, TRUE) RETURNING *`,
        [
          row.court_id,
          date.toISOString().split("T")[0],
          row.start_time,
          row.end_time,
        ]
      );

      const dayPrice = await pool.query(
        `SELECT * FROM WeekScheduleCourtPrice WHERE week_schedule_id = $1`,
        [row.id]
      );

      // Create day price for the new schedule
      await createDayPriceQuery({
        schedule_id: newSchedule.rows[0].id,
        hourPrice: dayPrice.rows[0].hourprice,
        halfPrice: dayPrice.rows[0].halfprice,
      });
    }
  }
};

export default generateScheduleForDay;
