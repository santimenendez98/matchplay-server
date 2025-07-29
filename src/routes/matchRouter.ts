import { Router } from "express";
import { getMatches, joinMatch, leaveMatch } from "../controllers/Match";

export const matchRouter = Router();

matchRouter.get("/", getMatches);
matchRouter.post("/join", joinMatch);
matchRouter.post("/leave", leaveMatch);

export default matchRouter;
