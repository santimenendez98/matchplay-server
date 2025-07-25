import e, { Response, Request } from "express";
import { addMinutesToTime } from "../services/addMinutes";
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
} from "../db/ReservationQueries";
import {
  getExistingOverlappingSchedule,
  getScheduleById,
  updateScheduleById,
  verifyHourAvailabilityQuery,
  updateReservationQuery,
} from "../db/ScheduleCourtQueries";
import { MatchModel, MatchGetModelSuccess } from "../types/Match";
import {
  createMatchQuery,
  deleteMatchByReservationIdQuery,
} from "../db/MatchQueries";
import { getPriceForReservationQuery } from "../db/ScheduleDayPrIceQueries";

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
  const today = new Date();

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
      reservation_date: today.toISOString().split("T")[0],
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

export const deleteReservation = async (
  req: Request<paramsModels>,
  res: Response<ReservationGetModelSuccess | errorResponseModel>
) => {
  try {
    const { id } = req.params;

    // Get the reservation details
    const reservation = await getReservationWithIdQuery(id);

    if (reservation.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "An error ocurred", error: "Reservation not found" });
    }

    const court = await getScheduleById(reservation.rows[0].schedule_id);

    // Update the schedule availability
    const slots = await getExistingOverlappingSchedule(
      court.rows[0].court_id,
      reservation.rows[0].start_time,
      reservation.rows[0].end_time
    );

    console.log(slots);

    await Promise.all(
      slots.rows.map((slot: any) =>
        updateScheduleById(
          "UPDATE ScheduleCourt SET is_available = true WHERE id = $1",
          [slot.id]
        )
      )
    );

    // Check if the reservation exists
    await deleteMatchByReservationIdQuery(id);

    // Delete the reservation
    const result = await deleteReservationQuery(id);

    res.status(200).json({
      message: "Reservation deleted successfully",
      data: result.rows[0],
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};
export default {
  getReservations,
  createReservation,
  deleteReservation,
};
