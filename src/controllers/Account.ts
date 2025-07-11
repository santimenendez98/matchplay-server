import { Request, Response } from "express";
import pool from "../db";
import { hashPassword } from "../services/bcrypService";

export const getAccounts = async (req: Request, res: Response) => {
  try {
    const accounts = await pool.query(`SELECT * FROM Account`);
    res.status(200).json({ message: "Account List", data: accounts.rows });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error ocurred", error: err.message });
  }
};

export const createAccount = async (req: Request, res: Response) => {
  const { name, email, password, birthdate, phone, account_type } = req.body;
  try {
    const hashedPassword = await hashPassword(password);
    const result = await pool.query(
      `INSERT INTO Account (name, email, password, birthdate, phone, account_type) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, email, hashedPassword, birthdate, phone, account_type]
    );
    res.status(201).json({
      message: "Account created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export const deleteAccount = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`DELETE FROM Account WHERE id = $1`, [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Account not found" });
    }
    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export const updateAccount = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, email, birthdate, phone } = req.body;
  try {
    const fields = { name, email, birthdate, phone };
    const keys = Object.keys(fields).filter(
      (key) => fields[key as keyof typeof fields] !== undefined
    );

    if (keys.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }
    const setClause = keys.map((key, idx) => `${key} = $${idx + 1}`).join(", ");
    const values = keys.map((key) => fields[key as keyof typeof fields]);

    const query = `UPDATE account SET ${setClause} WHERE id = $${
      keys.length + 1
    } RETURNING *`;

    const result = await pool.query(query, [...values, id]);
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
  deleteAccount,
  updateAccount,
  createAccount,
};
