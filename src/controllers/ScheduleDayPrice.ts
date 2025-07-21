import { Request, Response } from "express";
import { errorResponseModel, paramsModels } from "../types";
import {
  DayPriceGetModelSuccess,
  DayPriceModel,
  DayPriceModelSuccess,
  updateDayPriceModel,
} from "../types/Price";
import {
  getAllDayPriceQuery,
  createDayPriceQuery,
  updateDayPriceQuery,
  deleteDayPriceQuery,
} from "../db/ScheduleDayPrIceQueries";

export const getScheduleDayPrice = async (
  req: Request,
  res: Response<errorResponseModel | DayPriceModelSuccess>
) => {
  try {
    const scheduleWeekPrice = await getAllDayPriceQuery();
    res.status(200).json({
      message: "Schedule Day Price List",
      data: scheduleWeekPrice.rows,
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export const createScheduleDayPrice = async (
  req: Request<{}, {}, DayPriceModel>,
  res: Response<errorResponseModel | DayPriceGetModelSuccess>
) => {
  const { schedule_id, hourPrice, halfPrice } = req.body;

  const newPrice = await createDayPriceQuery({
    schedule_id,
    hourPrice,
    halfPrice,
  });

  if (newPrice.rowCount === 0) {
    return res
      .status(400)
      .json({ message: "An error occurred", error: "Failed to create price" });
  }

  try {
    res.status(201).json({
      message: "Day Price created successfully",
      data: newPrice.rows[0],
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export const updateScheduleDayPrice = async (
  req: Request<paramsModels, updateDayPriceModel>,
  res: Response<DayPriceModelSuccess | errorResponseModel>
) => {
  const { id } = req.params;
  const { court_id, hourPrice, halfPrice } = req.body;
  try {
    const fields = {
      court_id,
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

    const result = await updateDayPriceQuery(
      `UPDATE ScheduleCourtPrice SET ${setClause} WHERE id = $${
        keys.length + 1
      } RETURNING *`,
      [...values, id]
    );

    res.status(200).json({
      message: "Day Price updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export const deleteScheduleDayPrice = async (
  req: Request<paramsModels>,
  res: Response<errorResponseModel | DayPriceModelSuccess>
) => {
  const { id } = req.params;
  try {
    const result = await deleteDayPriceQuery(id);

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ message: "An error occurred", error: "Day Price not found" });
    }

    res.status(200).json({
      message: "Day Price deleted successfully",
      data: result.rows[0],
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};
