import { Router } from "express";
import {
  getAccounts,
  updateAccount,
  deleteAccount,
  createAccount,
  getAccountById,
} from "../controllers/Account";
import { authMiddleware, rolMiddleware } from "../middleware";

export const accountRouter = Router();

accountRouter.get("/", authMiddleware, getAccounts); // Only accesible by app creator
accountRouter.get("/:id", authMiddleware, getAccountById); // Only accesible by app creator
accountRouter.put(
  "/:id",
  authMiddleware,
  rolMiddleware(["user"]),
  updateAccount
);
accountRouter.delete(
  "/:id",
  authMiddleware,
  rolMiddleware(["user"]),
  deleteAccount
);
accountRouter.post("/", createAccount);

export default accountRouter;
