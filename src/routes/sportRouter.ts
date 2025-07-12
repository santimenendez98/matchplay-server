import { Router } from "express";
import { getSports, createSport, deleteSport } from "../controllers/Sport";
import { authMiddleware } from "../middleware";

export const sportRouter = Router();

sportRouter.get("/", authMiddleware, getSports); //Only accessible by app creator
sportRouter.post("/", authMiddleware, createSport); //Only accessible by app creator
sportRouter.delete("/:id", authMiddleware, deleteSport); //Only accessible by app creator

export default sportRouter;
