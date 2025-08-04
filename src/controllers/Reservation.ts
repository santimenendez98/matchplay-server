import { Response, Request } from "express";
import {
  addMinutesToTime,
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

export const getReservations = async (
  req: Request,
  res: Response<ReservationModelSuccess | errorResponseModel>
) => {
  try {
    const result = await getAllReservationsQuery();
    res.status(200).json({ message: "Reservation List", data: result.rows });
  } catch (error) {
    const err = error as Error;
    res
      .status(500)
      .json({ message: "Error fetching reservations", error: err.message });
  }
};

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

    if (scheduleRes.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "An error ocurred", error: "Hour not found" });
    }

    const time = time_reserved === 1 ? 60 : 90;
    const start_time = scheduleRes.rows[0].start_time;
    const end_time = addMinutesToTime(start_time, time);

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
    const totalPrice: number =
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
      reservation_date: today,
      is_match,
      status: ["pending"],
    });

    // Update the availability of the schedule
    await Promise.all(
      scheduleReserve.rows.map((row) => updateReservationQuery(row.id))
    );

    if (is_match && result.rows[0].id) {
      const match: MatchModel = {
        court_id: scheduleRes.rows[0].court_id,
        creator_id: account_id,
        reservation_id: result.rows[0].id,
      };

      const matchReserve = await createMatchQuery(match);
      const time = getNext1Hour();

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

export const cancelReservation = async (
  req: Request<{}, {}, BodyCancelModel>,
  res: Response<{ message: string } | errorResponseModel>
) => {
  try {
    const { reservation_id, match_id, canceled_by } = req.body;

    // Get the reservation details
    const reservation = await getReservationWithIdQuery(reservation_id);
    const cancelRequest = await getCancelRequestByReserveQuery(reservation_id);
    const match = await getMatchByReservationQuery(reservation_id);

    //Additional check to ensure reservation exists and is not already cancelled or completed
    if (reservation.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "An error ocurred", error: "Reservation not found" });
    }

    if (reservation.rows[0].status.includes("cancelled")) {
      return res.status(400).json({
        message: "An error ocurred",
        error: "Reservation already cancelled",
      });
    }

    if (reservation.rows[0].status.includes("confirmed")) {
      return res.status(400).json({
        message: "An error ocurred",
        error: "Reservation already completed",
      });
    }

    if (match.rows.length > 0) {
      return res.status(400).json({
        message: "An error ocurred",
        error: "This request could not cancel the match",
      });
    }

    //Add cancelation to history
    const court = await getScheduleById(reservation.rows[0].schedule_id);

    if (cancelRequest.rows.length > 0) {
      // Check if the cancel request is approved
      if (
        cancelRequest.rows[0].cancel_status.includes("approved") ||
        cancelRequest.rows[0].cancel_status.includes("rejected")
      ) {
        return res.status(400).json({
          message: "An error ocurred",
          error: "Cancel request already processed",
        });
      }

      const cancelation: CancelModel = {
        reservation_id: cancelRequest.rows[0].reservation_id,
        match_id,
        canceled_by,
        cancelation_reason: cancelRequest.rows[0].reason,
        cancelation_date: getCurrentTime(),
      };

      await updateCancelRequestStatusQuery(
        cancelRequest.rows[0].id ? cancelRequest.rows[0].id : "",
        "approved"
      );
      await cancelReservationQuery(cancelation);
    }

    // Update the schedule availability
    await updateScheduleAvailable(
      court.rows[0].court_id,
      reservation.rows[0].start_time,
      reservation.rows[0].end_time
    );

    // Update the reservation status to cancelled
    if (reservation.rows[0].id) {
      await updateReservationStatusQuery(reservation.rows[0].id, "cancelled");
    }

    // Notify users about the cancellation
    emitNotificationCourt(reservation.rows[0].schedule_id);

    res.status(200).json({
      message: "Reservation cancelled successfully",
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

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

    if (reservation.rows[0].status.includes("confirmed")) {
      return res.status(400).json({
        message: "An error ocurred",
        error: "Reservation already completed",
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

      await updatePreReserveStatusQuery(match.rows[0].id, "cancelled");
      const resRequest = await cancelReservationQuery(cancelation);

      // Update the schedule availability and status

      if (match.rows[0].id && reservation.rows[0].id && court.rows[0].id) {
        await updateScheduleAvailable(
          court.rows[0].id,
          reservation.rows[0].start_time,
          reservation.rows[0].end_time
        );

        await deleteMatchPlayerQuery(match.rows[0].id);
        await updatePreReserveStatusQuery(match.rows[0].id, "cancelled");
        await updateStatusMatchQuery(match.rows[0].id, "cancelled");
        await updateReservationStatusQuery(reservation.rows[0].id, "cancelled");

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

export const cancelReservationRequest = async (
  req: Request<{}, {}, CancelReservationModel>,
  res: Response<errorResponseModel | CancelReservationModelSuccess>
) => {
  try {
    const today = getCurrentTime();
    const { reservation_id, requested_by, reason } = req.body;

    const reservation = await getReservationWithIdQuery(reservation_id);
    const schedule = await getScheduleById(reservation.rows[0].schedule_id);
    const scheduleReserve =
      schedule.rows[0].schedule_date + " " + reservation.rows[0].start_time;
    const getCancelRequest = await getCancelRequestByReserveQuery(
      reservation_id
    );

    //Check if the reservation exists
    if (reservation.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "An error ocurred", error: "Reservation not found" });
    }

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
  createReservation,
  cancelReservation,
  cancelReservationRequest,
  cancelPreReservation,
};
