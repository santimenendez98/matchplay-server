import { Router } from "express";
import { getMatches, joinMatch, leaveMatch } from "../controllers/Match";
import { authMiddleware, rolMiddleware } from "../middleware";

export const matchRouter = Router();

matchRouter.get("/", authMiddleware, getMatches);
matchRouter.post("/join", authMiddleware, rolMiddleware(["user"]), joinMatch);
matchRouter.post("/leave", authMiddleware, rolMiddleware(["user"]), leaveMatch);

export default matchRouter;
