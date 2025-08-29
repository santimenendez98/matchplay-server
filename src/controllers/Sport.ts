import { Request, Response } from "express";
import {
  SportModel,
  SportGetModelSuccess,
  SportModelSuccess,
} from "../types/Sport";
import { errorResponseModel, paramsModels } from "../types";
import {
  createSportQuery,
  getAllSportsQuery,
  deleteSportQuery,
  existingSportByNameQuery,
} from "../db/SportQueries";

// Get all sports
export const getSports = async (
  req: Request,
  res: Response<SportModelSuccess | errorResponseModel>
) => {
  try {
    const sports = await getAllSportsQuery();
    res.status(200).json({ message: "Sport List", data: sports.rows });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

// Create a new sport
export const createSport = async (
  req: Request<{}, {}, SportModel>,
  res: Response<SportGetModelSuccess | errorResponseModel>
) => {
  const { name, max_players } = req.body;
  try {
    const existingSport = await existingSportByNameQuery(name);

    if (existingSport.rows.length > 0) {
      return res
        .status(400)
        .json({ message: "An error occurred", error: "Sport already exists" });
    }

    const newSport = await createSportQuery(name, max_players);
    res.status(201).json({ message: "Sport created", data: newSport.rows[0] });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

// Delete a sport
export const deleteSport = async (
  req: Request<paramsModels>,
  res: Response<SportGetModelSuccess | errorResponseModel>
) => {
  const { id } = req.params;
  try {
    const deletedSport = await deleteSportQuery(Number(id));
    if (deletedSport.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "An error ocurred", error: "Sport not found" });
    }
    res
      .status(200)
      .json({ message: "Sport deleted", data: deletedSport.rows[0] });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export default {
  getSports,
  createSport,
  deleteSport,
};
