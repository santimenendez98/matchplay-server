import { Request, Response } from "express";
import { hashPassword } from "../services/bcrypService";
import {
  AccountModel,
  AccountModelSuccess,
  AccountGetModelSuccess,
  UpdateAccountModel,
} from "../types/Account";
import { paramsModels, errorResponseModel } from "../types/index";
import {
  getAllAccountsQuery,
  getAccountByIdQuery,
  createAccountQuery,
  deleteAccountQuery,
  updateAccoutQuery,
} from "../db/AccountQueries";
import { createCustomer, getCustomer } from "../services/mercadoPago";

export const getAccounts = async (
  req: Request,
  res: Response<AccountModelSuccess | errorResponseModel>
) => {
  try {
    const accounts = await getAllAccountsQuery();
    res.status(200).json({ message: "Account List", data: accounts.rows });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error ocurred", error: err.message });
  }
};

export const getAccountById = async (
  req: Request<paramsModels>,
  res: Response<AccountGetModelSuccess | errorResponseModel>
) => {
  const { id } = req.params;
  try {
    const result = await getAccountByIdQuery(id);
    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ message: "An error ocurred", error: "Account not found" });
    }
    res.status(200).json({ message: "Account found", data: result.rows[0] });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export const createAccount = async (
  req: Request<{}, {}, AccountModel>,
  res: Response<AccountGetModelSuccess | errorResponseModel>
) => {
  const { name, email, password, birthdate, phone, account_type } = req.body;
  try {
    let idCustomer;
    const hashedPassword = await hashPassword(password);
    const idCustomerData = await getCustomer(email);

    if (!idCustomerData) {
      idCustomer = await createCustomer({ email });
      console.log("Customer created in MercadoPago");
    } else {
      idCustomer = idCustomerData;
      console.log("Customer already exists in MercadoPago");
    }

    console.log("idCustomer:", idCustomer);
    console.log("id", idCustomer?.id);

    if (idCustomer) {
      const result = await createAccountQuery({
        id_customer: idCustomer.id,
        name,
        email,
        password: hashedPassword,
        birthdate,
        phone,
        account_type,
      });

      res.status(201).json({
        message: "Account created successfully",
        data: result.rows[0],
      });
    }
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export const deleteAccount = async (
  req: Request<paramsModels>,
  res: Response<AccountModelSuccess | errorResponseModel>
) => {
  const { id } = req.params;
  try {
    const result = await deleteAccountQuery(id);
    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ message: "An error ocurred", error: "Account not found" });
    }
    res
      .status(200)
      .json({ message: "Account deleted successfully", data: result.rows[0] });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export const updateAccount = async (
  req: Request<paramsModels, {}, UpdateAccountModel>,
  res: Response<AccountModelSuccess | errorResponseModel>
) => {
  const { id } = req.params;
  const { name, email, birthdate, phone } = req.body;
  try {
    const account = await getAccountByIdQuery(id);

    if (account.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "An error ocurred", error: "Account not found" });
    }

    const fields = { name, email, birthdate, phone };
    const keys = Object.keys(fields).filter(
      (key) => fields[key as keyof typeof fields] !== undefined
    );

    if (keys.length === 0) {
      return res
        .status(400)
        .json({ message: "An error ocurred", error: "No fields to update" });
    }
    const setClause = keys.map((key, idx) => `${key} = $${idx + 1}`).join(", ");
    const values = keys.map((key) => fields[key as keyof typeof fields]);

    const result = await updateAccoutQuery(
      `UPDATE account SET ${setClause} WHERE id = $${
        keys.length + 1
      } RETURNING *`,
      [...values, id]
    );
    res
      .status(200)
      .json({ message: "Account updated successfully", data: result.rows[0] });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export default {
  getAccounts,
  getAccountById,
  deleteAccount,
  updateAccount,
  createAccount,
};
