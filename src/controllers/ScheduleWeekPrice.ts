import { Request, Response } from "express";
import { errorResponseModel, paramsModels } from "../types";
import {
  WeekPriceModelSuccess,
  WeekPriceModel,
  WeekPriceGetModelSuccess,
  updateWeekPriceModel,
} from "../types/Price";
import {
  getAllWeekPriceQuery,
  createWeekPriceQuery,
  updateWeekPriceQuery,
  deleteWeekPriceQuery,
} from "../db/ScheduleWeekPriceQueries";

// Get all daily court prices
export const getScheduleWeekPrice = async (
  req: Request,
  res: Response<errorResponseModel | WeekPriceModelSuccess>
) => {
  try {
    const scheduleWeekPrice = await getAllWeekPriceQuery();
    res.status(200).json({
      message: "Schedule Week Price List",
      data: scheduleWeekPrice.rows,
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

// Create a new daily court price
export const createScheduleWeekPrice = async (
  req: Request<{}, {}, WeekPriceModel>,
  res: Response<errorResponseModel | WeekPriceGetModelSuccess>
) => {
  const { week_schedule_id, hourprice, halfprice } = req.body;

  const newPrice = await createWeekPriceQuery({
    week_schedule_id,
    hourprice,
    halfprice,
  });

  if (newPrice.rowCount === 0) {
    return res
      .status(400)
      .json({ message: "An error occurred", error: "Failed to create price" });
  }

  try {
    res.status(201).json({
      message: "Week Price created successfully",
      data: newPrice.rows[0],
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

// Update an existing daily court price
export const updateScheduleWeekPrice = async (
  req: Request<paramsModels, updateWeekPriceModel>,
  res: Response<WeekPriceModelSuccess | errorResponseModel>
) => {
  const { id } = req.params;
  const { week_schedule_id, hourPrice, halfPrice } = req.body;
  try {
    const fields = {
      week_schedule_id,
      hourPrice,
      halfPrice,
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

    const result = await updateWeekPriceQuery(
      `UPDATE WeekScheduleCourtPrice SET ${setClause} WHERE id = $${
        keys.length + 1
      } RETURNING *`,
      [...values, id]
    );

    res.status(200).json({
      message: "Week Price updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

// Delete a daily court price
export const deleteScheduleWeekPrice = async (
  req: Request<paramsModels>,
  res: Response<errorResponseModel | WeekPriceModelSuccess>
) => {
  const { id } = req.params;
  try {
    const result = await deleteWeekPriceQuery(id);

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ message: "An error occurred", error: "Week Price not found" });
    }

    res.status(200).json({
      message: "Week Price deleted successfully",
      data: result.rows[0],
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};
