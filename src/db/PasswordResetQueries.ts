import pool from "./connection";

export const createPasswordResetTokenQuery = (
  account_id: string,
  token_hash: string,
  expires_at: string
) =>
  pool.query(
    `INSERT INTO PasswordResetToken (account_id, token_hash, expires_at)
     VALUES ($1, $2, $3) RETURNING *`,
    [account_id, token_hash, expires_at]
  );

export const findPasswordResetByHashQuery = (token_hash: string) =>
  pool.query(
    `SELECT * FROM PasswordResetToken
     WHERE token_hash = $1 AND used = FALSE AND expires_at > NOW()`,
    [token_hash]
  );

export const markPasswordResetUsedQuery = (id: number | string) =>
  pool.query(`UPDATE PasswordResetToken SET used = TRUE WHERE id = $1`, [id]);
