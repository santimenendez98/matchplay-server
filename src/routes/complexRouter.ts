import { Router } from "express";
import {
  getComplexData,
  createComplexData,
  deleteComplexData,
  updateComplexData,
} from "../controllers/Complex";
import { authMiddleware, rolMiddleware } from "../middleware";

export const complexRouter = Router();

complexRouter.get("/", authMiddleware, getComplexData);
complexRouter.post("/", authMiddleware, createComplexData);
complexRouter.delete(
  "/:id",
  authMiddleware,
  rolMiddleware(["admin"]),
  deleteComplexData
);
complexRouter.put(
  "/:id",
  authMiddleware,
  rolMiddleware(["admin"]),
  updateComplexData
);

export default complexRouter;
