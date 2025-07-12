import { Request, Response } from "express";
import pool from "../db";

export const getSports = async (req: Request, res: Response) => {
  try {
    const sports = await pool.query(`SELECT * FROM Sport`);
    res.status(200).json({ message: "Sport List", data: sports.rows });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export const createSport = async (req: Request, res: Response) => {
  const { name, max_players } = req.body;
  try {
    const nameLowerCase = name.toLowerCase();

    const newSport = await pool.query(
      `INSERT INTO Sport (name, max_players) VALUES ($1, $2) RETURNING *`,
      [nameLowerCase, max_players]
    );
    res.status(201).json({ message: "Sport created", data: newSport.rows[0] });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export const deleteSport = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const deletedSport = await pool.query(
      `DELETE FROM Sport WHERE id = $1 RETURNING *`,
      [id]
    );
    if (deletedSport.rows.length === 0) {
      return res.status(404).json({ message: "Sport not found" });
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
