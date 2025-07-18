// repositories/scheduleCourt.repository.ts
import pool from "./connection";
import { scheduleDayModel } from "../types/ScheduleCourt";

export const getAllSchedules = () =>
  pool.query<scheduleDayModel>(`SELECT * FROM ScheduleCourt`);

export const getScheduleById = (id: number | string) =>
  pool.query<scheduleDayModel>(`SELECT * FROM ScheduleCourt WHERE id = $1`, [
    id,
  ]);

export const insertSchedule = (data: {
  court_id: number;
  schedule_date: string;
  start_time: string;
  end_time: string;
  price: number;
}) =>
  pool.query<scheduleDayModel>(
    `INSERT INTO ScheduleCourt (court_id, schedule_date, start_time, end_time, price) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [
      data.court_id,
      data.schedule_date,
      data.start_time,
      data.end_time,
      data.price,
    ]
  );

export const deleteScheduleById = (id: number | string) =>
  pool.query<scheduleDayModel>(
    `DELETE FROM ScheduleCourt WHERE id = $1 RETURNING *`,
    [id]
  );

export const updateScheduleById = (query: string, values: any[]) =>
  pool.query<scheduleDayModel[]>(query, values);

export const getOverlappingSchedules = (
  court_id: number,
  start_time: string,
  end_time: string
) =>
  pool.query<scheduleDayModel>(
    `SELECT * FROM ScheduleCourt WHERE court_id = $1 AND is_available = TRUE AND start_time >= $2 AND end_time <= $3`,
    [court_id, start_time, end_time]
  );
