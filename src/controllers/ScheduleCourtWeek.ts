import { Response, Request } from "express";
import pool from "../db";
import generateScheduleForDay from "../services/scheduleService";
import { addDays } from "date-fns";

export const getScheduleCourtWeek = async (req: Request, res: Response) => {
  try {
    const schedule = await pool.query(`SELECT * FROM WeekScheduleCourt`);
    res
      .status(200)
      .json({ message: "Schedule Court Week List", data: schedule.rows });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export const createScheduleCourtWeek = async (req: Request, res: Response) => {
  try {
    const { court_id, day_of_week, schedule_time, price } = req.body;
    const today = new Date();

    const newSchedule = await pool.query(
      `INSERT INTO WeekScheduleCourt (court_id, day_of_week, schedule_time, price) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [court_id, day_of_week, schedule_time, price]
    );

    for (let i = 0; i < 7; i++) {
      const targetDate = addDays(today, i);
      if (targetDate.getDay() === day_of_week) {
        await generateScheduleForDay(targetDate);
      }
      targetDate.setDate(today.getDate() + i);
      await generateScheduleForDay(targetDate);
    }

    return res.status(201).json({
      message: "Schedule Court Week created successfully",
      data: newSchedule.rows[0],
    });
  } catch (error) {
    const err = error as Error;
    return res
      .status(500)
      .json({ message: "An error occurred", error: err.message });
  }
};

export const updateScheduleCourtWeek = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { court_id, day_of_week, schedule_time } = req.body;
  try {
    const scheduleCourtWeek = await pool.query(
      `SELECT * FROM WeekScheduleCourt WHERE id = $1`,
      [id]
    );

    if (scheduleCourtWeek.rows.length === 0) {
      return res.status(404).json({ message: "WeekScheduleCourt not found" });
    }

    const fields = { court_id, day_of_week, schedule_time };
    const keys = Object.keys(fields).filter(
      (key) => fields[key as keyof typeof fields] !== undefined
    );

    if (keys.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }
    const setClause = keys.map((key, idx) => `${key} = $${idx + 1}`).join(", ");
    const values = keys.map((key) => fields[key as keyof typeof fields]);

    const query = `UPDATE WeekScheduleCourt SET ${setClause} WHERE id = $${
      keys.length + 1
    } RETURNING *`;

    const result = await pool.query(query, [...values, id]);
    res.status(200).json({
      message: "WeekScheduleCourt updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export const deleteScheduleCourtWeek = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const deletedSchedule = await pool.query(
      `DELETE FROM WeekScheduleCourt WHERE id = $1 RETURNING *`,
      [id]
    );
    if (deletedSchedule.rows.length === 0) {
      return res.status(404).json({ message: "WeekScheduleCourt not found" });
    }
    res.status(200).json({
      message: "WeekScheduleCourt deleted",
      data: deletedSchedule.rows[0],
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export default {
  getScheduleCourtWeek,
  createScheduleCourtWeek,
  updateScheduleCourtWeek,
  deleteScheduleCourtWeek,
};
