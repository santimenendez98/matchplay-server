import pool from "../db/connection";
import { ReservationModel } from "../types/Reservation";

export const getAllReservationsQuery = () =>
  pool.query<ReservationModel>(`SELECT * FROM Reservation`);

export const getReservationWithIdQuery = (id: string) =>
  pool.query<ReservationModel>(`SELECT * FROM Reservation WHERE id = $1`, [id]);

export const verifyHourAvailabilityQuery = (
  start_time: string,
  end_time: string
) =>
  pool.query(
    `SELECT * FROM ScheduleCourt WHERE is_available = TRUE AND start_time >= $1 AND end_time <= $2`,
    [start_time, end_time]
  );

export const createReservationQuery = (reservation: ReservationModel) =>
  pool.query<ReservationModel>(
    `INSERT INTO Reservation (schedule_id, account_id, price, start_time, end_time, time_reserved, reservation_date, status) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      reservation.schedule_id,
      reservation.account_id,
      reservation.price,
      reservation.start_time,
      reservation.end_time,
      reservation.time_reserved,
      reservation.reservation_date,
      reservation.status[0],
    ]
  );

export const updateReservationQuery = (id: string) =>
  pool.query<ReservationModel>(
    `UPDATE ScheduleCourt SET is_available = FALSE WHERE id = $1`,
    [id]
  );

export const getPriceForReservationQuery = (schedule_id: string) =>
  pool.query(`SELECT * FROM ScheduleCourtPrice WHERE schedule_id = $1`, [
    schedule_id,
  ]);
