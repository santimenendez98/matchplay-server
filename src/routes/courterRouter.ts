import { Router } from "express";
import {
  getCourts,
  createCourt,
  deleteCourt,
  updateAccount,
} from "../controllers/Court";
import { authMiddleware, rolMiddleware } from "../middleware";

export const courtRouter = Router();

courtRouter.get("/", authMiddleware, getCourts);
courtRouter.post("/", authMiddleware, rolMiddleware(["admin"]), createCourt);
courtRouter.delete(
  "/:id",
  authMiddleware,
  rolMiddleware(["admin"]),
  deleteCourt
);
courtRouter.put(
  "/:id",
  authMiddleware,
  rolMiddleware(["admin"]),
  updateAccount
);

export default courtRouter;
