import { Request, Response } from "express";
import {
  CourtModel,
  CourtGetModelSuccess,
  CourtModelSuccess,
  updateCourtModel,
} from "../types/Court";
import { paramsModels, errorResponseModel } from "../types";
import {
  createCourtQuery,
  getAllCourtQuery,
  deleteCourtQuery,
  getCourtByIdQuery,
  getCourtsByComplexQuery,
  updateCourtQuery,
} from "../db/CourtQueries";
import { parsePagination } from "../services/pagination";

export const getCourts = async (
  req: Request,
  res: Response<CourtModelSuccess | errorResponseModel>
) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const courts = await getAllCourtQuery(limit, offset);
    res.status(200).json({ message: "Court List", data: courts.rows });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export const getCourtsByComplex = async (
  req: Request<{ complexId: string }>,
  res: Response<CourtModelSuccess | errorResponseModel>
) => {
  try {
    const { complexId } = req.params;
    const result = await getCourtsByComplexQuery(complexId);
    res.status(200).json({ message: "Court List", data: result.rows });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export const getCourt = async (
  req: Request<paramsModels>,
  res: Response<CourtGetModelSuccess | errorResponseModel>
) => {
  try {
    const { id } = req.params;
    const result = await getCourtByIdQuery(id);
    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "An error ocurred", error: "Court not found" });
    }
    res
      .status(200)
      .json({ message: "Court found", data: result.rows[0] });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export const createCourt = async (
  req: Request<{}, {}, CourtModel>,
  res: Response<CourtGetModelSuccess | errorResponseModel>
) => {
  const { complex_id, sport_id, name, image_url } = req.body;
  try {
    const newCourt = await createCourtQuery({
      complex_id,
      sport_id,
      name,
      image_url,
    });
    res
      .status(201)
      .json({ message: "Court created successfully", data: newCourt.rows[0] });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export const deleteCourt = async (
  req: Request<paramsModels>,
  res: Response<CourtGetModelSuccess | errorResponseModel>
) => {
  const { id } = req.params;
  try {
    const result = await deleteCourtQuery(id);
    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ message: "An error ocurred", error: "Court not found" });
    }
    res.status(200).json({
      message: "Court deleted successfully",
      data: result.rows[0],
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export const updateAccount = async (
  req: Request<paramsModels, {}, updateCourtModel>,
  res: Response<CourtModelSuccess | errorResponseModel>
) => {
  const { id } = req.params;
  const { name, image_url } = req.body;
  try {
    const court = await getCourtByIdQuery(id);

    if (court.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "An error ocurred", error: "Court not found" });
    }

    const fields = { name, image_url };
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

    const result = await updateCourtQuery(
      `UPDATE Court SET ${setClause} WHERE id = $${
        keys.length + 1
      } RETURNING *`,
      [...values, id]
    );
    res
      .status(200)
      .json({ message: "Court updated successfully", data: result.rows[0] });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export default {
  getCourts,
  createCourt,
  deleteCourt,
  updateAccount,
};
