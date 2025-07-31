import { Router } from "express";
import {
  getReservations,
  createReservation,
  cancelReservation,
  cancelReservationRequest,
} from "../controllers/Reservation";
import { authMiddleware, rolMiddleware } from "../middleware";

export const reservationRouter = Router();

reservationRouter.get("/", authMiddleware, getReservations);
reservationRouter.post(
  "/",
  authMiddleware,
  rolMiddleware(["user"]),
  createReservation
);
reservationRouter.post(
  "/cancelrequest",
  authMiddleware,
  rolMiddleware(["user"]),
  cancelReservationRequest
);
reservationRouter.patch(
  "/cancel/:id",
  authMiddleware,
  rolMiddleware(["admin"]),
  cancelReservation
);

export default reservationRouter;
