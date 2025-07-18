import { Request, Response } from "express";
import pool from "../db/connection";

export const getCourts = async (req: Request, res: Response) => {
  try {
    const courts = await pool.query(`SELECT * FROM Court`);
    res.status(200).json({ message: "Court List", data: courts.rows });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export const createCourt = async (req: Request, res: Response) => {
  const { complex_id, sport_id, name, image_url } = req.body;
  try {
    const newCourt = await pool.query(
      `INSERT INTO Court (complex_id, sport_id, name, image_url) VALUES ($1, $2, $3, $4) RETURNING *`,
      [complex_id, sport_id, name, image_url]
    );
    res
      .status(201)
      .json({ message: "Court created successfully", data: newCourt.rows[0] });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export const deleteCourt = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`DELETE FROM Court WHERE id = $1`, [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Court not found" });
    }
    res.status(200).json({ message: "Court deleted successfully" });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export const updateAccount = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, image_url } = req.body;
  try {
    const court = await pool.query(`SELECT * FROM Court WHERE id = $1`, [id]);

    if (court.rows.length === 0) {
      return res.status(404).json({ message: "Court not found" });
    }

    const fields = { name, image_url };
    const keys = Object.keys(fields).filter(
      (key) => fields[key as keyof typeof fields] !== undefined
    );

    if (keys.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }
    const setClause = keys.map((key, idx) => `${key} = $${idx + 1}`).join(", ");
    const values = keys.map((key) => fields[key as keyof typeof fields]);

    const query = `UPDATE Court SET ${setClause} WHERE id = $${
      keys.length + 1
    } RETURNING *`;

    const result = await pool.query(query, [...values, id]);
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
