import { Request, Response } from "express";
import pool from "../db";

export const getScheduleDay = async (req: Request, res: Response) => {
  try {
    const scheduleDay = await pool.query(`SELECT * FROM ScheduleCourt`);
    res.status(200).json({ message: "Court List", data: scheduleDay.rows });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export const createScheduleDay = async (req: Request, res: Response) => {
  const { court_id, schedule_date, start_time, end_time, price } = req.body;
  try {
    const newScheduleDay = await pool.query(
      `INSERT INTO ScheduleCourt (court_id, schedule_date, start_time, end_time, price) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [court_id, schedule_date, start_time, end_time, price]
    );
    res
      .status(201)
      .json({ message: "Schedule Day created", data: newScheduleDay.rows[0] });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export const updateScheduleDay = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { court_id, schedule_date, start_time, end_time, is_available } =
    req.body;
  try {
    const scheduleDay = await pool.query(
      `SELECT * FROM ScheduleCourt WHERE id = $1`,
      [id]
    );

    if (scheduleDay.rows.length === 0) {
      return res.status(404).json({ message: "ScheduleCourt not found" });
    }

    const fields = {
      court_id,
      schedule_date,
      start_time,
      end_time,
      is_available,
    };
    const keys = Object.keys(fields).filter(
      (key) => fields[key as keyof typeof fields] !== undefined
    );

    if (keys.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }
    const setClause = keys.map((key, idx) => `${key} = $${idx + 1}`).join(", ");
    const values = keys.map((key) => fields[key as keyof typeof fields]);

    const query = `UPDATE ScheduleCourt SET ${setClause} WHERE id = $${
      keys.length + 1
    } RETURNING *`;

    const result = await pool.query(query, [...values, id]);
    res.status(200).json({
      message: "ScheduleCourt updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export const deleteScheduleDay = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const deletedScheduleDay = await pool.query(
      `DELETE FROM ScheduleCourt WHERE id = $1 RETURNING *`,
      [id]
    );
    if (deletedScheduleDay.rows.length === 0) {
      return res.status(404).json({ message: "ScheduleCourt not found" });
    }
    res.status(200).json({
      message: "ScheduleCourt deleted",
      data: deletedScheduleDay.rows[0],
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export default {
  getScheduleDay,
  createScheduleDay,
  updateScheduleDay,
  deleteScheduleDay,
};
