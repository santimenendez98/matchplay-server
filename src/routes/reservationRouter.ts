import { Router } from "express";
import {
  getReservations,
  createReservation,
  deleteReservation,
} from "../controllers/Reservation";

export const reservationRouter = Router();

reservationRouter.get("/", getReservations);
reservationRouter.post("/", createReservation);
reservationRouter.delete("/:id", deleteReservation);

export default reservationRouter;
