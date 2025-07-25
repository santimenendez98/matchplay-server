import { Router } from "express";
import { getMatches } from "../controllers/Match";

export const matchRouter = Router();

matchRouter.get("/", getMatches);

export default matchRouter;
