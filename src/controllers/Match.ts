import { Request, Response } from "express";
import pool from "../db/connection";
import { errorResponseModel, paramsModels } from "../types";
import {
  MatchModel,
  MatchGetModelSuccess,
  MatchModelSuccess,
} from "../types/Match";
import { deleteMatchQuery } from "../db/MatchQueries";

export const getMatches = async (
  req: Request,
  res: Response<MatchModelSuccess | errorResponseModel>
) => {
  try {
    const result = await pool.query("SELECT * FROM Matches");
    res.status(200).json({ message: "Match List", data: result.rows });
  } catch (error) {
    const err = error as Error;
    res
      .status(500)
      .json({ message: "Error fetching matches", error: err.message });
  }
};

export const deleteMatch = async (
  req: Request<paramsModels>,
  res: Response<MatchGetModelSuccess | errorResponseModel>
) => {
  try {
    const { id } = req.params;
    const result = await deleteMatchQuery(id);

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ message: "An error ocurred", error: "Match not found" });
    }

    res
      .status(200)
      .json({ message: "Match deleted successfully", data: result.rows[0] });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};
