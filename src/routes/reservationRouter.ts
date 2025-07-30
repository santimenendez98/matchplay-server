import { Router } from "express";
import {
  getReservations,
  createReservation,
  cancellReservation,
} from "../controllers/Reservation";
import { authMiddleware, rolMiddleware } from "../middleware";

export const reservationRouter = Router();

reservationRouter.get("/", authMiddleware, getReservations);
reservationRouter.post("/", authMiddleware, createReservation);
reservationRouter.patch(
  "/:id",
  authMiddleware,
  rolMiddleware(["admin"]),
  cancellReservation
);

export default reservationRouter;
