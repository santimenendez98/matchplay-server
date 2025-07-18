import { pool } from "../db";
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

export const updateAccoutQuery = (query: string, values: any[]) =>
  pool.query<AccountModel[]>(query, values);
