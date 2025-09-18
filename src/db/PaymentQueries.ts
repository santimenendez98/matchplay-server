import { historyPaymentModel } from "../types/Payment";
import pool from "./connection";

export const getPaymentByMatchAndAccount = async (
  match_id: string,
  account_id: string
) => {
  return pool.query<historyPaymentModel>(
    `SELECT * FROM Payment WHERE match_id = $1 AND user_id = $2`,
    [match_id, account_id]
  );
};

export const getPaymentByReservationAndAccount = async (
  reservation_id: string,
  account_id: string
) => {
  return pool.query<historyPaymentModel>(
    `SELECT * FROM Payment WHERE reservation_id = $1 AND user_id = $2`,
    [reservation_id, account_id]
  );
};

export const getPaymentByIdQuery = async (payment_id: string) => {
  return pool.query<historyPaymentModel>(
    `SELECT * FROM Payment WHERE id = $1`,
    [payment_id]
  );
};

export const updatePaymentStatusQuery = async (
  payment_id: string,
  status: "pending" | "completed" | "failed" | "cancelled"
) => {
  pool.query(`UPDATE Payment SET payment_status = $1 WHERE id = $2`, [
    status,
    payment_id,
  ]);
};

export const createPaymentHistoryQuery = async (data: historyPaymentModel) => {
  return pool.query<historyPaymentModel>(
    `INSERT INTO Payment (user_id, reservation_id, total_amount, payment_method, payment_status, payment_date, paid_by, mp_payment_id, proof_transfer)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [
      data.account_id,
      data.reservation_id,
      data.total_amount,
      data.payment_method,
      data.payment_status,
      data.payment_date,
      data.paid_by,
      data.mp_payment_id,
      data.proof_of_payment,
    ]
  );
};
