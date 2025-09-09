import { Response, Request } from "express";
import generateScheduleForDay from "../services/scheduleService";
import { addDays } from "date-fns";
import {
  addOrRemoveMinutresToTime,
  getCurrentTime,
  timeToMinutes,
} from "../services/addMinutes";
import {
  WeekScheduleCourtModel,
  WeekScheduleCourtGetModelSuccess,
  WeekScheduleCourtModelSuccess,
  updateWeekScheduleCourtModel,
} from "../types/ScheduleWeekCourt";
import { paramsModels, errorResponseModel } from "../types";
import {
  getAllScheduleCourtWeekQuery,
  createScheduleCourtWeekQuery,
  deleteScheduleCourtWeekQuery,
  updateScheduleCourtWeekQuery,
  overlappingSchedulesQuery,
  getWeekScheduleCourtByIdQuery,
  existingOneOverlappingQuery,
} from "../db/ScheduleCourtWeekQueries";
import { createWeekPriceQuery } from "../db/ScheduleWeekPriceQueries";

export const getScheduleCourtWeek = async (
  req: Request,
  res: Response<WeekScheduleCourtModelSuccess | errorResponseModel>
) => {
  try {
    const schedule = await getAllScheduleCourtWeekQuery();
    res
      .status(200)
      .json({ message: "Schedule Court Week List", data: schedule.rows });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export const createScheduleCourtWeek = async (
  req: Request<{}, {}, WeekScheduleCourtModel>,
  res: Response<WeekScheduleCourtGetModelSuccess | errorResponseModel>
) => {
  try {
    const {
      court_id,
      day_of_week,
      start_time,
      end_time,
      hourprice,
      halfprice,
    } = req.body;
    const today = new Date();

    const overlappingSchedules = await overlappingSchedulesQuery(
      court_id,
      day_of_week,
      start_time,
      end_time
    );

    if (start_time >= end_time) {
      return res.status(400).json({
        message: "An error ocurred",
        error: "Start time must be before end time",
      });
    }

    if (overlappingSchedules.rows.length > 0) {
      return res.status(400).json({
        message: "An error ocurred",
        error: "Schedule overlaps with existing schedule for this court",
      });
    }

    const newSchedule = await createScheduleCourtWeekQuery({
      court_id,
      day_of_week,
      start_time,
      end_time,
      hourprice,
      halfprice,
    });

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

export const updateScheduleCourtWeek = async (
  req: Request<paramsModels, {}, updateWeekScheduleCourtModel>,
  res: Response<WeekScheduleCourtModelSuccess | errorResponseModel>
) => {
  const { id } = req.params;
  const { court_id, day_of_week, start_time, end_time, hourprice, halfprice } =
    req.body;
  try {
    const scheduleCourtWeek = await getWeekScheduleCourtByIdQuery(id);

    if (scheduleCourtWeek.rows.length === 0) {
      return res.status(404).json({
        message: "An error ocurred",
        error: "WeekScheduleCourt not found",
      });
    }

    const fields = {
      court_id,
      day_of_week,
      start_time,
      end_time,
      hourprice,
      halfprice,
    };
    const keys = Object.keys(fields).filter(
      (key) => fields[key as keyof typeof fields] !== undefined
    );

    if (keys.length === 0) {
      return res
        .status(400)
        .json({ message: "An error ocurred", error: "No fields to update" });
    }
    const setClause = keys.map((key, idx) => `${key} = $${idx + 1}`).join(", ");
    const values = keys.map((key) => fields[key as keyof typeof fields]);

    const result = await updateScheduleCourtWeekQuery(
      `UPDATE WeekScheduleCourt SET ${setClause} WHERE id = $${
        keys.length + 1
      } RETURNING *`,
      [...values, id]
    );
    res.status(200).json({
      message: "WeekScheduleCourt updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export const deleteScheduleCourtWeek = async (
  req: Request<paramsModels>,
  res: Response<WeekScheduleCourtGetModelSuccess | errorResponseModel>
) => {
  const { id } = req.params;
  try {
    const deletedSchedule = await deleteScheduleCourtWeekQuery(id);

    if (deletedSchedule.rows.length === 0) {
      return res.status(404).json({
        message: "An error ocurred",
        error: "WeekScheduleCourt not found",
      });
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

export const generateScheduleCourtWeek = async (
  req: Request<{}, {}, WeekScheduleCourtModel>,
  res: Response<WeekScheduleCourtGetModelSuccess | errorResponseModel>
) => {
  const { court_id, day_of_week, start_time, end_time, hourprice, halfprice } =
    req.body;
  const today = getCurrentTime();

  try {
    if (timeToMinutes(start_time) >= timeToMinutes(end_time)) {
      return res.status(400).json({
        message: "An error occurred",
        error: "Start time must be before end time",
      });
    }

    let currentTime = start_time;

    while (timeToMinutes(currentTime) + 30 <= timeToMinutes(end_time)) {
      const nextTime = addOrRemoveMinutresToTime(currentTime, "+", 30);

      const overlap = await existingOneOverlappingQuery(
        court_id,
        day_of_week,
        currentTime,
        nextTime
      );

      if (overlap.rows.length > 0) {
        currentTime = nextTime;
        continue;
      }

      const scheduleRes = await createScheduleCourtWeekQuery({
        court_id,
        day_of_week,
        start_time: currentTime,
        end_time: nextTime,
        hourprice,
        halfprice,
      });

      const resId = scheduleRes.rows[0]?.id;

      if (resId !== undefined) {
        await createWeekPriceQuery({
          week_schedule_id: resId.toString(),
          hourprice,
          halfprice,
        });
      }

      currentTime = nextTime;
    }

    for (let i = 0; i < 7; i++) {
      const date = addDays(today, i);
      console.log(date.getDay());
      if (date.getDay() === day_of_week) {
        await generateScheduleForDay(date);
      }
    }

    res.status(201).json({
      message: "Weekly schedule generated successfully",
      data: {
        court_id,
        day_of_week,
        start_time,
        end_time,
        hourprice,
        halfprice,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Error generating weekly schedule",
      error: (error as Error).message,
    });
  }
};

export default {
  getScheduleCourtWeek,
  createScheduleCourtWeek,
  updateScheduleCourtWeek,
  deleteScheduleCourtWeek,
  generateScheduleCourtWeek,
};
