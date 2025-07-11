import { Router } from "express";
import {
  getAccounts,
  updateAccount,
  deleteAccount,
  createAccount,
} from "../controllers/Account";
import authMiddleware from "../middleware";

export const accountRouter = Router();

accountRouter.get("/", authMiddleware, getAccounts);
accountRouter.put("/:id", authMiddleware, updateAccount);
accountRouter.delete("/:id", authMiddleware, deleteAccount);
accountRouter.post("/", createAccount);

export default accountRouter;
