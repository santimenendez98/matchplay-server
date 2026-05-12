import { Request, Response } from "express";
import crypto from "crypto";
import { addMinutes } from "date-fns";
import { hashPassword, verifyPassword } from "../services/bcrypService";
import {
  generateRefreshToken,
  generateToken,
  verifyRefreshToken,
} from "../services/jwtService";
import { AuthModel } from "../types/Auth";
import {
  getAccountByEmailQuery,
  getAccountByIdQuery,
  updatePasswordQuery,
} from "../db/AccountQueries";
import {
  createPasswordResetTokenQuery,
  findPasswordResetByHashQuery,
  markPasswordResetUsedQuery,
} from "../db/PasswordResetQueries";
import { errorResponseModel } from "../types";
import logger from "../services/logger";

const RESET_TOKEN_TTL_MINUTES = 30;
const PASSWORD_RESET_GENERIC_MESSAGE =
  "If the email exists, a password reset link has been sent";

const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const loginController = async (
  req: Request<{}, {}, AuthModel>,
  res: Response
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
    const refreshToken = generateRefreshToken(account.id, account.account_type);

    res.status(200).json({
      message: "Login successful",
      data: {
        id: account.id,
        token,
        refreshToken,
        rol: account.account_type,
      },
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export const refreshController = async (
  req: Request<{}, {}, { refreshToken: string }>,
  res: Response
) => {
  const { refreshToken } = req.body;
  try {
    const payload = verifyRefreshToken(refreshToken);
    const account = await getAccountByIdQuery(payload.id);
    if (account.rows.length === 0) {
      return res
        .status(401)
        .json({ message: "An error ocurred", error: "Invalid refresh token" });
    }
    const token = generateToken(payload.id, payload.rol);
    const newRefresh = generateRefreshToken(payload.id, payload.rol);
    res.status(200).json({
      message: "Token refreshed",
      data: { token, refreshToken: newRefresh, rol: payload.rol },
    });
  } catch (error) {
    return res
      .status(401)
      .json({ message: "An error ocurred", error: "Invalid refresh token" });
  }
};

export const forgotPasswordController = async (
  req: Request<{}, {}, { email: string }>,
  res: Response
) => {
  const { email } = req.body;
  try {
    const result = await getAccountByEmailQuery(email);
    // Always respond the same way to avoid email enumeration.
    if (result.rows.length === 0 || !result.rows[0].id) {
      return res.status(200).json({
        message: PASSWORD_RESET_GENERIC_MESSAGE,
      });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = addMinutes(
      new Date(),
      RESET_TOKEN_TTL_MINUTES
    ).toISOString();

    await createPasswordResetTokenQuery(
      result.rows[0].id,
      tokenHash,
      expiresAt
    );

    // Production: send the token by email here. For now, log it and (only in
    // non-production) return it so the frontend or tooling can complete the
    // reset flow during development/testing.
    logger.info({ email, expiresAt }, "Password reset token generated");

    if (process.env.NODE_ENV !== "production") {
      return res
        .status(200)
        .json({ message: PASSWORD_RESET_GENERIC_MESSAGE, token: rawToken });
    }
    return res.status(200).json({ message: PASSWORD_RESET_GENERIC_MESSAGE });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export const resetPasswordController = async (
  req: Request<{}, {}, { token: string; new_password: string }>,
  res: Response<{ message: string } | errorResponseModel>
) => {
  const { token, new_password } = req.body;
  try {
    const tokenHash = hashToken(token);
    const tokenRow = await findPasswordResetByHashQuery(tokenHash);
    if (tokenRow.rows.length === 0) {
      return res.status(400).json({
        message: "An error ocurred",
        error: "Invalid or expired token",
      });
    }
    const { id, account_id } = tokenRow.rows[0];
    const hashed = await hashPassword(new_password);
    await updatePasswordQuery(account_id, hashed);
    await markPasswordResetUsedQuery(id);
    res.status(200).json({ message: "Password updated" });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export default loginController;
