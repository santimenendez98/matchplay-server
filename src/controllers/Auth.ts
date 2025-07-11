import { Request, Response } from "express";
import pool from "../db";
import { verifyPassword } from "../services/bcrypService";
import { generateToken } from "../services/jwtService";

export const loginController = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(`SELECT * FROM Account WHERE email = $1`, [
      email,
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Account not found" });
    }

    const account = result.rows[0];
    const isPasswordValid = await verifyPassword(password, account.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid password" });
    }

    const token = generateToken(account.id, account.account_type);
    const data = {
      id: account.id,
      token: token,
    };

    res.status(200).json({ message: "Login successful", data: data });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export default loginController;
