import { Router } from "express";
import {
  getAccounts,
  updateAccount,
  deleteAccount,
  createAccount,
} from "../controllers/Account";

export const accountRouter = Router();

accountRouter.get("/", getAccounts);
accountRouter.put("/:id", updateAccount);
accountRouter.delete("/:id", deleteAccount);
accountRouter.post("/", createAccount);

export default accountRouter;
