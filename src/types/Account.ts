import { ParamsDictionary } from "express-serve-static-core";

export interface AccountModel {
  id?: number;
  name: string;
  email: string;
  password: string;
  birthdate: string;
  phone: string;
  account_type: "admin" | "user";
}

export interface AccountModelSuccess {
  message: string;
  data: AccountModel[];
}

export interface AccountGetModelSuccess {
  message: string;
  data: AccountModel;
}

export interface AccountModelError {
  message: string;
  error: string;
}

export interface AccountParams extends ParamsDictionary {
  id: string;
}

export type UpdateAccountModel = Pick<
  AccountModel,
  "id" | "name" | "email" | "birthdate" | "phone" | "account_type"
>;
