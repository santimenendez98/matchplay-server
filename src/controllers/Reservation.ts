import { Response, Request } from "express";
import pool from "../db";
import { addMinutesToTime } from "../services/addMinutes";

export const getReservations = async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT * FROM Reservation");
    res.status(200).json({ message: "Reservation List", data: result.rows });
  } catch (error) {
    const err = error as Error;
    res
      .status(500)
      .json({ message: "Error fetching reservations", error: err.message });
  }
};

export const createReservation = async (req: Request, res: Response) => {
  const { schedule_id, account_id, time_reserved } = req.body;
  const today = new Date();

  try {
    // Get the schedule details
    const scheduleRes = await pool.query(
      "SELECT * FROM ScheduleCourt WHERE id = $1",
      [schedule_id]
    );

    if (scheduleRes.rows.length === 0) {
      return res.status(404).json({ message: "Hour not found" });
    }

    const schedule = scheduleRes.rows[0];
    const end_time =
      time_reserved === 1
        ? addMinutesToTime(schedule.start_time, 60)
        : addMinutesToTime(schedule.start_time, 90);

    // Check if the reservation overlaps with existing reservations
    const overlappingRes = await pool.query(
      `SELECT * FROM ScheduleCourt
       WHERE court_id = $1
         AND schedule_date = $2
         AND is_available = TRUE
         AND $3 < end_time AND $4 > start_time`,
      [schedule.court_id, schedule.schedule_date, schedule.start_time, end_time]
    );

    if (overlappingRes.rows.length === 0) {
      return res.status(400).json({
        message: "No hay horarios disponibles para la duración solicitada",
      });
    }

    // Calculate the total price
    const totalPrice = schedule.price * time_reserved;

    // Insert the reservation
    const result = await pool.query(
      `INSERT INTO Reservation (schedule_id, account_id, price, start_time, end_time, time_reserved, reservation_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        schedule_id,
        account_id,
        totalPrice,
        schedule.start_time,
        end_time,
        time_reserved,
        today.toISOString().split("T")[0],
      ]
    );

    // Update the availability of the schedule
    await Promise.all(
      overlappingRes.rows.map((row) =>
        pool.query(
          "UPDATE ScheduleCourt SET is_available = FALSE WHERE id = $1",
          [row.id]
        )
      )
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
