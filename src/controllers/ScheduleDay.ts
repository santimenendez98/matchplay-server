import { Request, RequestHandler, Response } from "express";
import pool from "../db";
import {
  scheduleDayModel,
  scheduleDayModelSuccess,
  scheduleDayModelError,
  updateScheduleDayModel,
  createScheduleDayModel,
  schedulePostDayModelSuccess,
  scheduleDeleteModelSuccess,
  scheduleDayParams,
} from "../types/ScheduleCourt";
import {
  getAllSchedules,
  insertSchedule,
  getScheduleById,
  deleteScheduleById,
  updateScheduleById,
  getOverlappingSchedules,
} from "../db/ScheduleCourtQueries";

export const getScheduleDay = async (
  req: Request,
  res: Response<scheduleDayModelSuccess | scheduleDayModelError>
) => {
  try {
    const scheduleDay = await getAllSchedules();
    res.status(200).json({ message: "Court List", data: scheduleDay.rows });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export const createScheduleDay = async (
  req: Request<{}, {}, createScheduleDayModel>,
  res: Response<schedulePostDayModelSuccess | scheduleDayModelError>
) => {
  const { court_id, schedule_date, start_time, end_time, price } = req.body;
  try {
    const newScheduleDay = await insertSchedule({
      court_id,
      schedule_date,
      start_time,
      end_time,
      price,
    });
    res
      .status(201)
      .json({ message: "Schedule Day created", data: newScheduleDay.rows[0] });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export const updateScheduleDay = async (
  req: Request<
    scheduleDayParams,
    scheduleDayModelSuccess | scheduleDayModelError,
    updateScheduleDayModel
  >,
  res: Response<scheduleDayModelSuccess | scheduleDayModelError>
) => {
  const { id } = req.params;
  const { court_id, start_time, end_time, price } = req.body;
  try {
    const scheduleDay = await getScheduleById(id);

    if (scheduleDay.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Error", error: "ScheduleCourt not found" });
    }

    const overlappingSchedules = await getOverlappingSchedules(
      court_id,
      start_time,
      end_time
    );

    if (overlappingSchedules.rows.length > 0) {
      return res.status(400).json({
        message: "Error",
        error: "Schedule overlaps with existing schedule for this court",
      });
    }

    const fields = {
      court_id,
      start_time,
      end_time,
      price,
    };
    const keys = Object.keys(fields).filter(
      (key) => fields[key as keyof typeof fields] !== undefined
    );

    if (keys.length === 0) {
      return res
        .status(400)
        .json({ message: "Error", error: "No fields to update" });
    }
    const setClause = keys.map((key, idx) => `${key} = $${idx + 1}`).join(", ");
    const values = keys.map((key) => fields[key as keyof typeof fields]);

    const result = await updateScheduleById(
      `UPDATE ScheduleCourt SET ${setClause} WHERE id = $${
        keys.length + 1
      } RETURNING *`,
      [...values, id]
    );

    res.status(200).json({
      message: "ScheduleCourt updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export const deleteScheduleDay = async (
  req: Request<scheduleDayParams>,
  res: Response<scheduleDeleteModelSuccess | scheduleDayModelError>
) => {
  const { id } = req.params;
  try {
    const deletedScheduleDay = await deleteScheduleById(id);

    if (deletedScheduleDay.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Error", error: "ScheduleCourt not found" });
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
