import { historyPaymentModel } from "../types/Payment";
import pool from "./connection";

export const getPaymentByMatchAndAccount = async (
  match_id: string,
  account_id: string
) => {
  return pool.query<historyPaymentModel>(
    `SELECT * FROM Payment WHERE match_id = $1 AND account_id = $2`,
    [match_id, account_id]
  );
};

export const createPaymentHistoryQuery = async (data: historyPaymentModel) => {
  pool.query(
    `INSERT INTO Payment (user_id, reservation_id, total_amount, payment_method, payment_status, payment_date, paid_by, mp_payment_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      data.account_id,
      data.reservation_id,
      data.total_amount,
      data.payment_method,
      data.payment_status,
      data.payment_date,
      data.paid_by,
      data.mp_payment_id,
    ]
  );
};
