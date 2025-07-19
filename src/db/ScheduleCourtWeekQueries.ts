import pool from "../db/connection";
import { WeekScheduleCourtModel } from "../types/ScheduleWeekCourt";

export const getAllScheduleCourtWeekQuery = () =>
  pool.query<WeekScheduleCourtModel>(
    `SELECT * FROM WeekScheduleCourt ORDER BY day_of_week ASC, start_time ASC`
  );

export const getWeekScheduleCourtByIdQuery = (id: string) =>
  pool.query<WeekScheduleCourtModel>(
    `SELECT * FROM WeekScheduleCourt WHERE id = $1`,
    [id]
  );

export const overlappingSchedulesQuery = (
  court_id: number,
  day_of_week: number,
  start_time: string,
  end_time: string
) =>
  pool.query(
    `SELECT * FROM WeekScheduleCourt 
       WHERE court_id = $1 AND day_of_week = $2 
       AND ((end_time > $3 AND start_time < $4) OR (start_time < $4 AND end_time > $3))`,
    [court_id, day_of_week, start_time, end_time]
  );

export const existingOneOverlappingQuery = (
  court_id: number,
  day_of_week: number,
  start_time: string,
  end_time: string
) =>
  pool.query(
    `SELECT 1 FROM WeekScheduleCourt
         WHERE court_id = $1 AND day_of_week = $2
         AND start_time < $4 AND end_time > $3`,
    [court_id, day_of_week, start_time, end_time]
  );

export const createScheduleCourtWeekQuery = (
  schedule: WeekScheduleCourtModel
) =>
  pool.query<WeekScheduleCourtModel>(
    `INSERT INTO WeekScheduleCourt (court_id, day_of_week, start_time, end_time, price) 
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [
      schedule.court_id,
      schedule.day_of_week,
      schedule.start_time,
      schedule.end_time,
      schedule.price,
    ]
  );

export const deleteScheduleCourtWeekQuery = (id: string) =>
  pool.query(`DELETE FROM WeekScheduleCourt WHERE id = $1`, [id]);

export const updateScheduleCourtWeekQuery = (query: string, values: any[]) =>
  pool.query<WeekScheduleCourtModel[]>(query, values);
