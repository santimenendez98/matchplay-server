import pool from "../db/connection";
import { CancelModel } from "../types/CancelReservation";
import { PreReserveModel, ReservationModel } from "../types/Reservation";

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
      reservation.status,
    ]
  );

export const deleteReservationQuery = (id: string) =>
  pool.query(`DELETE FROM Reservation WHERE id = $1`, [id]);

export const updateReservationStatusQuery = (id: string, status: string) =>
  pool.query<ReservationModel>(
    `UPDATE Reservation SET status = $1 WHERE id = $2 RETURNING *`,
    [status, id]
  );

export const checkReservationExistsQuery = (
  account_id: string,
  current_time: string
) =>
  pool.query<ReservationModel>(
    `SELECT * FROM Reservation WHERE account_id = $1 AND end_time > $2  AND status = 'pending'`,
    [account_id, current_time]
  );

// Pre-reservation

export const createPreReserveQuery = (preReserve: {
  court_id: string;
  match_id?: string;
  expiration_date: string;
  registration_status: string;
}) =>
  pool.query(
    `INSERT INTO PreRegistration (court_id, match_id, expiration_date, registration_status) 
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [
      preReserve.court_id,
      preReserve.match_id,
      preReserve.expiration_date,
      preReserve.registration_status,
    ]
  );

export const getPreReserveByMatchQuery = (match_id: string) =>
  pool.query<PreReserveModel[]>(
    `SELECT * FROM PreRegistration WHERE match_id = $1`,
    [match_id]
  );

export const updatePreReserveStatusQuery = (match_id: string, status: string) =>
  pool.query<PreReserveModel>(
    `UPDATE PreRegistration SET registration_status = $1 WHERE match_id = $2 RETURNING *`,
    [status, match_id]
  );

export const updateExpiredPreReservesQuery = (time: string) =>
  pool.query<PreReserveModel>(
    `UPDATE PreRegistration SET registration_status = 'cancelled' 
     WHERE expiration_date < $1 AND registration_status = 'pending' RETURNING *`,
    [time]
  );

export const deletePreReserveQuery = (match_id: string) => {
  return pool.query(`DELETE FROM PreRegistration WHERE match_id = $1`, [
    match_id,
  ]);
};

// Cancel Reservation History

export const cancelReservationQuery = (cancelation: CancelModel) => {
  return pool.query(
    `INSERT INTO HistoryCancelReservation (reservation_id, match_id, cancelled_by, cancellation_reason, cancellation_date)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      cancelation.reservation_id,
      cancelation.match_id,
      cancelation.canceled_by,
      cancelation.cancelation_reason,
      cancelation.cancelation_date,
    ]
  );
};
