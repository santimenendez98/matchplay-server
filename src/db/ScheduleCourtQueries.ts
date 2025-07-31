// repositories/scheduleCourt.repository.ts
import pool from "./connection";
import { scheduleDayModel } from "../types/ScheduleCourt";
import { ReservationModel } from "../types/Reservation";

export const getAllSchedules = () =>
  pool.query<scheduleDayModel>(
    `SELECT * FROM ScheduleCourt ORDER BY schedule_date, start_time ASC`
  );

export const getScheduleById = (id: number | string) =>
  pool.query<scheduleDayModel>(`SELECT * FROM ScheduleCourt WHERE id = $1`, [
    id,
  ]);

export const insertSchedule = (data: {
  court_id: string;
  schedule_date: string;
  start_time: string;
  end_time: string;
}) =>
  pool.query<scheduleDayModel>(
    `INSERT INTO ScheduleCourt (court_id, schedule_date, start_time, end_time) VALUES ($1, $2, $3, $4) RETURNING *`,
    [data.court_id, data.schedule_date, data.start_time, data.end_time]
  );

export const deleteScheduleById = (id: number | string) =>
  pool.query<scheduleDayModel>(
    `DELETE FROM ScheduleCourt WHERE id = $1 RETURNING *`,
    [id]
  );

export const updateScheduleById = (query: string, values: any[]) =>
  pool.query<scheduleDayModel[]>(query, values);

export const getOverlappingSchedules = (
  court_id: string,
  start_time: string,
  end_time: string
) =>
  pool.query<scheduleDayModel>(
    `SELECT * FROM ScheduleCourt WHERE court_id = $1 AND is_available = TRUE AND start_time >= $2 AND end_time <= $3`,
    [court_id, start_time, end_time]
  );

export const getExistingOverlappingSchedule = (
  court_id: string,
  start_time: string,
  end_time: string
) =>
  pool.query<scheduleDayModel>(
    `SELECT * FROM ScheduleCourt WHERE is_available = FALSE AND court_id = $1 AND start_time < $3 AND end_time > $2`,
    [court_id, start_time, end_time]
  );

export const updateReservationQuery = (id: string) =>
  pool.query<ReservationModel>(
    `UPDATE ScheduleCourt SET is_available = FALSE WHERE id = $1`,
    [id]
  );

export const verifyHourAvailabilityQuery = (
  start_time: string,
  end_time: string
) =>
  pool.query(
    `SELECT * FROM ScheduleCourt WHERE is_available = TRUE AND start_time >= $1 AND end_time <= $2`,
    [start_time, end_time]
  );

export const checkScheduleStausQuery = (current_date: string) => {
  return pool.query(
    `UPDATE ScheduleCourt SET is_available = FALSE WHERE is_available = TRUE AND (schedule_date || ' ' || start_time) < $1 OR (schedule_date || ' ' || end_time) < $1`,
    [current_date]
  );
};

export const updateScheduleAvailable = async (
  court_id: string,
  start_time: string,
  end_time: string
) => {
  const slots = await getExistingOverlappingSchedule(
    court_id,
    start_time,
    end_time
  );

  await Promise.all(
    slots.rows.map((slot: any) =>
      updateScheduleById(
        "UPDATE ScheduleCourt SET is_available = true WHERE id = $1",
        [slot.id]
      )
    )
  );
};
