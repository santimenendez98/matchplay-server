import { Response, Request } from "express";
import {
  addOrRemoveMinutresToTime,
  getCurrentTime,
  getNext1Hour,
  isWithin24Hours,
} from "../services/addMinutes";
import {
  ReservationModel,
  ReservationGetModelSuccess,
  ReservationModelSuccess,
} from "../types/Reservation";
import { errorResponseModel } from "../types";
import {
  getAllReservationsQuery,
  createReservationQuery,
  getReservationWithIdQuery,
  getReservationsByAccountQuery,
  createPreReserveQuery,
  updatePreReserveStatusQuery,
  updateReservationStatusQuery,
  cancelReservationQuery,
  checkReservationExistsQuery,
} from "../db/ReservationQueries";
import {
  getScheduleById,
  verifyHourAvailabilityQuery,
  updateReservationQuery,
  updateScheduleAvailable,
} from "../db/ScheduleCourtQueries";
import { MatchModel, MatchGetModelSuccess } from "../types/Match";
import {
  createMatchQuery,
  deleteMatchPlayerQuery,
  getCantPlayersByScheduleQuery,
  getMatchByReservationQuery,
  joinMatchQuery,
  updateStatusMatchQuery,
} from "../db/MatchQueries";
import { getPriceForReservationQuery } from "../db/ScheduleDayPrIceQueries";
import {
  BodyCancelModel,
  BodyCancelPreReserveModel,
  CancelModel,
  CancelReservationModel,
  CancelReservationModelSuccess,
} from "../types/CancelReservation";
import {
  createCancelRequestQuery,
  getCancelRequestByReserveQuery,
  updateCancelRequestStatusQuery,
} from "../db/CancelRequestQueries";
import { getCourtByIdQuery } from "../db/CourtQueries";
import {
  emitNotificationCancelRequest,
  emitNotificationCourt,
} from "../services/webSocket";
import { getAccountByIdQuery } from "../db/AccountQueries";
import { parsePagination } from "../services/pagination";
import {
  createRefundQuery,
  getPaymentByReservation,
  getPaymentByReservationAndAccount,
  updatePaymentStatusByReservationQuery,
  updatePaymentStatusQuery,
} from "../db/PaymentQueries";
import { refundBody } from "../types/Payment";

// Get all reservations
export const getReservations = async (
  req: Request,
  res: Response<ReservationModelSuccess | errorResponseModel>
) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const result = await getAllReservationsQuery(limit, offset);
    res.status(200).json({ message: "Reservation List", data: result.rows });
  } catch (error) {
    const err = error as Error;
    res
      .status(500)
      .json({ message: "Error fetching reservations", error: err.message });
  }
};

// Get reservation by id
export const getReservationById = async (
  req: Request<{ id: string }>,
  res: Response<ReservationGetModelSuccess | errorResponseModel>
) => {
  try {
    const { id } = req.params;
    const result = await getReservationWithIdQuery(id);
    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "An error ocurred",
        error: "Reservation not found",
      });
    }
    const reservation = result.rows[0];
    const isAdmin =
      req.user?.rol === "admin" || req.user?.rol === "creator";
    // For matches anyone authenticated can read; for plain reservations only
    // the owner (or an admin) can.
    if (!reservation.is_match && !isAdmin && req.user?.id !== reservation.account_id) {
      return res
        .status(403)
        .json({ message: "An error ocurred", error: "Forbidden" });
    }
    res.status(200).json({
      message: "Reservation found",
      data: reservation,
    });
  } catch (error) {
    const err = error as Error;
    res
      .status(500)
      .json({ message: "An error occurred", error: err.message });
  }
};

// Get all reservations for the authenticated user (or for an account_id)
export const getReservationsByAccount = async (
  req: Request<{ accountId: string }>,
  res: Response<ReservationModelSuccess | errorResponseModel>
) => {
  try {
    const { accountId } = req.params;
    const targetId = accountId === "me" ? req.user?.id : accountId;
    if (!targetId) {
      return res.status(400).json({
        message: "An error ocurred",
        error: "Missing account id",
      });
    }
    // Non-admins cannot read other users' reservations
    if (
      accountId !== "me" &&
      req.user?.id !== String(targetId) &&
      req.user?.rol !== "admin" &&
      req.user?.rol !== "creator"
    ) {
      return res.status(403).json({
        message: "An error ocurred",
        error: "Forbidden",
      });
    }
    const { limit, offset } = parsePagination(req.query);
    const result = await getReservationsByAccountQuery(
      String(targetId),
      limit,
      offset
    );
    res
      .status(200)
      .json({ message: "Reservation List", data: result.rows });
  } catch (error) {
    const err = error as Error;
    res
      .status(500)
      .json({ message: "Error fetching reservations", error: err.message });
  }
};

// Create a new reservation
export const createReservation = async (
  req: Request<{}, {}, ReservationModel>,
  res: Response<
    MatchGetModelSuccess | ReservationGetModelSuccess | errorResponseModel
  >
) => {
  const { schedule_id, account_id, time_reserved, is_match } = req.body;
  const today = getCurrentTime();

  try {
    // Get the schedule details
    const scheduleRes = await getScheduleById(schedule_id);
    const reservation = await checkReservationExistsQuery(account_id, today);
    const account = await getAccountByIdQuery(account_id);

    if (account.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "An error ocurred", error: "Account not found" });
    }

    if (scheduleRes.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "An error ocurred", error: "Hour not found" });
    }

    const time = time_reserved === 1 ? 60 : 90;
    const start_time = scheduleRes.rows[0].start_time;
    const end_time = addOrRemoveMinutresToTime(start_time, "+", time);

    //Verify if the hour is available
    const scheduleReserve = await verifyHourAvailabilityQuery(
      start_time,
      end_time
    );

    if (scheduleReserve.rows.length < 2) {
      return res.status(400).json({
        message: "An error ocurred",
        error: "No available slots for this time",
      });
    }

    //Verify if the player has an active reservation

    if (reservation.rows.length > 0) {
      return res.status(400).json({
        message: "An error ocurred",
        error: "A reservation is already active for this player",
      });
    }

    // Calculate the total price
    const getPrice = await getPriceForReservationQuery(schedule_id);
    const totalPrice =
      time_reserved === 1
        ? getPrice.rows[0].hourprice
        : getPrice.rows[0].halfprice;

    // Insert the reservation
    const result = await createReservationQuery({
      schedule_id,
      account_id,
      price: totalPrice,
      start_time,
      end_time,
      time_reserved,
      reservation_date: scheduleRes.rows[0].schedule_date,
      is_match,
      status: "pending",
    });

    // Update the availability of the schedule
    await Promise.all(
      scheduleReserve.rows.map((row) => updateReservationQuery(row.id))
    );

    if (is_match && result.rows[0].id) {
      const cantPlayers = await getCantPlayersByScheduleQuery(schedule_id);
      const price = totalPrice / cantPlayers.rows[0].max_players;
      const match: MatchModel = {
        court_id: scheduleRes.rows[0].court_id,
        creator_id: account_id,
        reservation_id: result.rows[0].id,
        total_players: cantPlayers.rows[0].max_players,
        price_per_player: price,
      };

      const matchReserve = await createMatchQuery(match);
      const time = getNext1Hour();

      if (!matchReserve.rows[0].id) {
        return res.status(500).json({
          message: "An error ocurred",
          error: "Could not create match for the reservation",
        });
      }

      // Create pre-reservation if match is created
      await createPreReserveQuery({
        court_id: scheduleRes.rows[0].court_id,
        match_id: matchReserve.rows[0].id,
        expiration_date: time,
        registration_status: "pending",
      });

      // Join the match if it was created successfully
      if (matchReserve.rows[0].id) {
        await joinMatchQuery(matchReserve.rows[0].id, account_id, today);
      }

      return res.status(201).json({
        message: "Match created successfully",
        data: matchReserve.rows[0],
      });
    }

    return res.status(201).json({
      message: "Reservation created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      message: "Error creating reservation",
      error: err.message,
    });
  }
};

// Cancel a reservation
export const cancelReservation = async (
  req: Request<{}, {}, BodyCancelModel>,
  res: Response<{ message: string } | errorResponseModel>
) => {
  try {
    const { reservation_id, canceled_by } = req.body;

    // 1. Find the reservation
    const reservation = await getReservationWithIdQuery(reservation_id);
    if (reservation.rows.length === 0) {
      return res.status(404).json({
        message: "An error occurred",
        error: "Reservation not found",
      });
    }

    const reservationData = reservation.rows[0];

    // 2. Validate reservation status
    if (reservationData.status === "cancelled") {
      return res.status(400).json({
        message: "An error occurred",
        error: "Reservation already cancelled",
      });
    }

    // 3. Check if reservation is part of a match (cannot cancel here)
    const match = await getMatchByReservationQuery(reservation_id);
    if (match.rows.length > 0) {
      return res.status(400).json({
        message: "An error occurred",
        error: "This request cannot cancel a match",
      });
    }

    // 4. Check if a cancellation request already exists
    const cancelRequest = await getCancelRequestByReserveQuery(reservation_id);
    const request = cancelRequest.rows[0];

    if (request?.id) {
      if (
        request.cancel_status === "approved" ||
        request.cancel_status === "rejected"
      ) {
        return res.status(400).json({
          message: "An error occurred",
          error: "Cancel request already processed",
        });
      }

      // Create a cancellation record based on the request
      const cancelation: CancelModel = {
        reservation_id: request.reservation_id,
        canceled_by,
        cancelation_reason: request.reason,
        cancelation_date: getCurrentTime(),
      };

      await updateCancelRequestStatusQuery(request.id, "approved");
      await cancelReservationQuery(cancelation);
    }

    // 5. Update payment status if exists for this reservation
    const payment = await getPaymentByReservationAndAccount(
      reservation_id,
      reservationData.account_id
    );

    if (payment.rows.length > 0 && payment.rows[0].id) {
      await updatePaymentStatusQuery(payment.rows[0].id, "cancelled");

      // Create Refund if payment exists

      const data: refundBody = {
        payment_id: payment.rows[0].id,
        refund_reason: "Reservation cancelled",
        refund_date: getCurrentTime(),
      };

      await createRefundQuery(data);
    }

    // 6. Free the court in the corresponding schedule
    const court = await getScheduleById(reservationData.schedule_id);
    await updateScheduleAvailable(
      court.rows[0].court_id,
      reservationData.start_time,
      reservationData.end_time
    );

    // 7. Update reservation status
    if (reservationData.id) {
      await updateReservationStatusQuery(reservationData.id, "cancelled");
    }

    // 8. Notify users about the cancellation
    emitNotificationCourt(reservationData.schedule_id);

    return res.status(200).json({
      message: "Reservation cancelled successfully",
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "An error occurred",
      error: error.message,
    });
  }
};

// Cancel a pre-reservation (match)
export const cancelPreReservation = async (
  req: Request<{}, {}, BodyCancelPreReserveModel>,
  res: Response<errorResponseModel | CancelReservationModelSuccess>
) => {
  try {
    const { canceled_by, reservation_id } = req.body;
    const today = getCurrentTime();

    // Check if the reservation and match exists
    const reservation = await getReservationWithIdQuery(reservation_id);

    if (reservation.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "An error ocurred", error: "Reservation not found" });
    }

    if (reservation.rows[0].is_match === false) {
      return res.status(400).json({
        message: "An error ocurred",
        error: "Reservation is not a match, cannot cancel reservation",
      });
    }

    // Check if the reservation is already cancelled or completed
    if (reservation.rows[0].status.includes("cancelled")) {
      return res.status(400).json({
        message: "An error ocurred",
        error: "Reservation already cancelled",
      });
    }

    const match = await getMatchByReservationQuery(reservation_id);
    const court = await getCourtByIdQuery(match.rows[0].court_id);

    if (match.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "An error ocurred", error: "Match not found" });
    }

    // Create a cancellation request
    if (match.rows[0].id) {
      const cancelation: CancelModel = {
        reservation_id: reservation_id,
        match_id: match.rows[0].id,
        canceled_by,
        cancelation_reason: "Pre-reservation cancelled",
        cancelation_date: today,
      };

      const resRequest = await cancelReservationQuery(cancelation);

      // Update the schedule availability and status

      if (match.rows[0].id && reservation.rows[0].id && court.rows[0].id) {
        await updateScheduleAvailable(
          court.rows[0].id,
          reservation.rows[0].start_time,
          reservation.rows[0].end_time
        );

        await updatePreReserveStatusQuery(match.rows[0].id, "cancelled");
        await updateStatusMatchQuery(match.rows[0].id, "cancelled");
        await updateReservationStatusQuery(reservation.rows[0].id, "cancelled");
        await updatePaymentStatusByReservationQuery(
          reservation.rows[0].id,
          "cancelled"
        );

        // Create Refund if payment exists
        const payment = await getPaymentByReservation(reservation_id);

        if (payment.rows.length > 0 && payment.rows[0].id) {
          payment.rows.map((pay) => {
            const data: refundBody = {
              payment_id: pay.id!,
              refund_reason: "Match cancelled",
              refund_date: today,
            };

            createRefundQuery(data);
          });
        }

        // Notify users about the cancellation
        emitNotificationCourt(reservation.rows[0].schedule_id);
        emitNotificationCancelRequest(reservation_id);
      }

      res.status(201).json({
        message: "Cancellation request created successfully",
        data: resRequest.rows[0],
      });
    }
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

// Create cancellation request for a reservation
export const cancelReservationRequest = async (
  req: Request<{}, {}, CancelReservationModel>,
  res: Response<errorResponseModel | CancelReservationModelSuccess>
) => {
  try {
    const today = getCurrentTime();
    const { reservation_id, requested_by, reason } = req.body;

    const reservation = await getReservationWithIdQuery(reservation_id);

    //Check if the reservation exists
    if (reservation.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "An error ocurred", error: "Reservation not found" });
    }

    const schedule = await getScheduleById(reservation.rows[0].schedule_id);
    const scheduleReserve =
      schedule.rows[0].schedule_date + " " + reservation.rows[0].start_time;
    const getCancelRequest = await getCancelRequestByReserveQuery(
      reservation_id
    );

    //Check if the reservation is already cancelled
    if (reservation.rows[0].status.includes("cancelled")) {
      return res.status(400).json({
        message: "An error ocurred",
        error: "Reservation already cancelled",
      });
    }

    //Check if the reservation is already completed
    if (reservation.rows[0].status.includes("confirmed")) {
      return res.status(400).json({
        message: "An error ocurred",
        error: "Reservation already completed",
      });
    }

    //Check if the reservation is a match
    if (reservation.rows[0].is_match) {
      return res.status(400).json({
        message: "An error ocurred",
        error: "Reservation is a match, cannot cancel request",
      });
    }

    // Check if a cancellation request already exists
    if (getCancelRequest.rows.length > 0) {
      return res.status(400).json({
        message: "An error ocurred",
        error: "Cancellation request already exists for this reservation",
      });
    }

    //Check reservation date
    if (isWithin24Hours(scheduleReserve)) {
      return res.status(400).json({
        message: "An error ocurred",
        error: "Reservation is not within 24 hours, cannot cancel request",
      });
    }

    // Create the cancellation request
    const cancelRequest = await createCancelRequestQuery({
      reservation_id,
      requested_by,
      reason,
      requested_at: today,
    });

    // Notify admin about the cancellation request
    if (cancelRequest.rows[0].id) {
      emitNotificationCancelRequest(cancelRequest.rows[0].id);
    }

    res.status(201).json({
      message: "Cancellation request created successfully",
      data: cancelRequest.rows[0],
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export default {
  getReservations,
  getReservationById,
  getReservationsByAccount,
  createReservation,
  cancelReservation,
  cancelReservationRequest,
  cancelPreReservation,
};
