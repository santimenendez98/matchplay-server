import pool from "../db/connection";
import { ReservationModel } from "../types/Reservation";

export const getAllReservationsQuery = () =>
  pool.query<ReservationModel>(`SELECT * FROM Reservation`);

export const getReservationWithIdQuery = (id: string) =>
  pool.query<ReservationModel>(`SELECT * FROM Reservation WHERE id = $1`, [id]);

export const createReservationQuery = (reservation: ReservationModel) =>
  pool.query<ReservationModel>(
    `INSERT INTO Reservation (schedule_id, account_id, price, start_time, end_time, time_reserved, reservation_date, is_match, status) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [
      reservation.schedule_id,
      reservation.account_id,
      reservation.price,
      reservation.start_time,
      reservation.end_time,
      reservation.time_reserved,
      reservation.reservation_date,
      reservation.is_match,
      reservation.status[0],
    ]
  );

export const deleteReservationQuery = (id: string) =>
  pool.query(`DELETE FROM Reservation WHERE id = $1`, [id]);
