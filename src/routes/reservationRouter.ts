import { Router } from "express";
import { getReservations, createReservation } from "../controllers/Reservation";

export const reservationRouter = Router();

reservationRouter.get("/", getReservations);
reservationRouter.post("/", createReservation);

export default reservationRouter;
