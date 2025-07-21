import e, { Response, Request } from "express";
import pool from "../db/connection";
import { addMinutesToTime } from "../services/addMinutes";
import {
  ReservationModel,
  ReservationGetModelSuccess,
  ReservationModelSuccess,
} from "../types/Reservation";
import { errorResponseModel } from "../types";
import {
  getAllReservationsQuery,
  verifyHourAvailabilityQuery,
  createReservationQuery,
  updateReservationQuery,
  getPriceForReservationQuery,
} from "../db/ReservationQueries";
import { getScheduleById } from "../db/ScheduleCourtQueries";

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
  res: Response<ReservationGetModelSuccess | errorResponseModel>
) => {
  const { schedule_id, account_id, time_reserved } = req.body;
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

    console.log("Total Price:", totalPrice);

    // Insert the reservation
    const result = await createReservationQuery({
      schedule_id,
      account_id,
      price: totalPrice,
      start_time,
      end_time,
      time_reserved,
      reservation_date: today.toISOString().split("T")[0],
      status: ["pending"],
    });

    // Update the availability of the schedule
    await Promise.all(
      scheduleReserve.rows.map((row) => updateReservationQuery(row.id))
    );

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

export default {
  getReservations,
  createReservation,
};
