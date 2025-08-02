import pool from "./connection";
import {
  CancelReservationModel,
  CancelReservationRequestModel,
} from "../types/CancelReservation";

export const createCancelRequestQuery = (
  cancelRequest: CancelReservationRequestModel
) =>
  pool.query<CancelReservationModel>(
    `INSERT INTO CancelRequest (reservation_id, requested_by, reason, cancel_status, requested_at) 
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [
      cancelRequest.reservation_id,
      cancelRequest.requested_by,
      cancelRequest.reason,
      "pending",
      cancelRequest.requested_at,
    ]
  );

export const getCancelRequestByReserveQuery = (id: string) =>
  pool.query<CancelReservationModel>(
    `SELECT * FROM CancelRequest WHERE reservation_id = $1`,
    [id]
  );

export const updateCancelRequestStatusQuery = (
  id: string,
  status: "approved" | "rejected"
) =>
  pool.query(`UPDATE CancelRequest SET cancel_status = $1 WHERE id = $2`, [
    status,
    id,
  ]);
