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

    const time = time_reserved === 1 ? 60 : 90;
    const start_time = scheduleRes.rows[0].start_time;
    const end_time = addMinutesToTime(start_time, time);

    const scheduleReserve = await pool.query(
      `SELECT * FROM ScheduleCourt WHERE is_available = TRUE AND start_time >= $1 AND end_time <= $2 `,
      [start_time, end_time]
    );

    if (scheduleReserve.rows.length < 2) {
      return res
        .status(400)
        .json({ message: "No available slots for this time" });
    }

    // Calculate the total price
    const totalPrice = scheduleRes.rows[0].price * time_reserved;

    // Insert the reservation
    const result = await pool.query(
      `INSERT INTO Reservation (schedule_id, account_id, price, start_time, end_time, time_reserved, reservation_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        schedule_id,
        account_id,
        totalPrice,
        start_time,
        end_time,
        time_reserved,
        today.toISOString().split("T")[0],
      ]
    );

    // Update the availability of the schedule
    await Promise.all(
      scheduleReserve.rows.map((row) =>
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
