import { pool } from "./connection";
import { AccountModel } from "../types/Account";

export const getAllAccountsQuery = () =>
  pool.query<AccountModel>(`SELECT * FROM Account`);

export const getAccountByIdQuery = (id: number | string) =>
  pool.query<AccountModel>(`SELECT * FROM Account WHERE id = $1`, [id]);

export const createAccountQuery = (account: AccountModel) =>
  pool.query<AccountModel>(
    `INSERT INTO Account (name, email, password, birthdate, phone, account_type) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [
      account.name,
      account.email,
      account.password,
      account.birthdate,
      account.phone,
      account.account_type,
    ]
  );

export const deleteAccountQuery = (id: number | string) =>
  pool.query(`DELETE FROM Account WHERE id = $1`, [id]);

export const updateAccountQuery = (id: string, account: AccountModel) =>
  pool.query<AccountModel>(
    `UPDATE Account SET name= COALESCE($1, name), email= COALESCE($2, email), birthdate= COALESCE($3, birthdate), phone= COALESCE($4, phone) WHERE id = $5 RETURNING *`,
    [account.name, account.email, account.birthdate, account.phone, id]
  );

export const getAccountByEmailQuery = (email: string) =>
  pool.query<AccountModel>(`SELECT * FROM Account WHERE email = $1`, [email]);

export const getAccountAdminQuery = (id: number | string) =>
  pool.query<AccountModel>(
    `SELECT * FROM Account WHERE id = $1 AND account_type = 'admin'`,
    [id]
  );
