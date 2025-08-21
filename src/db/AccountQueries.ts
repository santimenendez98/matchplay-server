import { pool } from "./connection";
import { AccountModel } from "../types/Account";

export const getAllAccountsQuery = () =>
  pool.query<AccountModel>(`SELECT * FROM Account`);

export const getAccountByIdQuery = (id: string) =>
  pool.query<AccountModel>(`SELECT * FROM Account WHERE id = $1`, [id]);

export const createAccountQuery = (account: AccountModel) =>
  pool.query<AccountModel>(
    `INSERT INTO Account (id_customer, name, email, password, birthdate, phone, account_type) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      account.id_customer,
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

export const getAccountByEmailQuery = (email: string) =>
  pool.query<AccountModel>(`SELECT * FROM Account WHERE email = $1`, [email]);

export const getAccountAdminQuery = (id: number | string) =>
  pool.query<AccountModel>(
    `SELECT * FROM Account WHERE id = $1 AND account_type = 'admin'`,
    [id]
  );
