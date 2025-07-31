import e, { Response, Request } from "express";
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
import { errorResponseModel, paramsModels } from "../types";
import {
  getAllReservationsQuery,
  createReservationQuery,
  getReservationWithIdQuery,
  deleteReservationQuery,
  createPreReserveQuery,
  deletePreReserveQuery,
  updatePreReserveStatusQuery,
  updateReservationStatusQuery,
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
  deleteMatchByReservationIdQuery,
  deleteMatchPlayerQuery,
  getMatchByReservationQuery,
  joinMatchQuery,
  updateStatusMatchQuery,
} from "../db/MatchQueries";
import { getPriceForReservationQuery } from "../db/ScheduleDayPrIceQueries";
import {
  CancelReservationModel,
  CancelReservationModelSuccess,
} from "../types/CancelReservation";
import { createCancelRequestQuery } from "../db/CancelRequestQueries";

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
  req: Request<paramsModels>,
  res: Response<{ message: string } | errorResponseModel>
) => {
  try {
    const { id } = req.params;

    // Get the reservation details
    const reservation = await getReservationWithIdQuery(id);

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

    const court = await getScheduleById(reservation.rows[0].schedule_id);
    const match = await getMatchByReservationQuery(id);

    // Update the schedule availability
    await updateScheduleAvailable(
      court.rows[0].court_id,
      reservation.rows[0].start_time,
      reservation.rows[0].end_time
    );

    // If the reservation is part of a match, delete the match and pre-reservation

    if (match.rows[0].id && reservation.rows[0].id) {
      await deleteMatchPlayerQuery(match.rows[0].id);
      await updatePreReserveStatusQuery(match.rows[0].id, "cancelled");
      await updateStatusMatchQuery(match.rows[0].id, "cancelled");
      await updateReservationStatusQuery(reservation.rows[0].id, "cancelled");
    }

    res.status(200).json({
      message: "Reservation cancelled successfully",
    });
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
};
