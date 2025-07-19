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

export type UpdateAccountModel = Pick<
  AccountModel,
  "name" | "email" | "birthdate" | "phone" | "account_type"
>;
