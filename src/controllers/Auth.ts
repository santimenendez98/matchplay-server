import { Request, Response } from "express";
import { verifyPassword } from "../services/bcrypService";
import { generateToken } from "../services/jwtService";
import { AuthModel, AuthModelError, AuthModelSuccess } from "../types/Auth";
import { getAccountByEmailQuery } from "../db/AccountQueries";

export const loginController = async (
  req: Request<AuthModel>,
  res: Response<AuthModelSuccess | AuthModelError>
) => {
  const { email, password } = req.body;
  try {
    const result = await getAccountByEmailQuery(email);
    const account = result.rows[0];

    if (result.rowCount === 0 || !account.id) {
      return res
        .status(404)
        .json({ message: "An error ocurred", error: "Account not found" });
    }

    const isPasswordValid = await verifyPassword(password, account.password);

    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ message: "An error ocurred", error: "Invalid password" });
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
