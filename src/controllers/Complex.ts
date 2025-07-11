import { Request, Response } from "express";
import pool from "../db";

export const getComplexData = async (req: Request, res: Response) => {
  try {
    const complex = await pool.query(`SELECT * FROM Complex`);
    res.status(200).json({ message: "Complex List", data: complex.rows });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error ocurred", error: err.message });
  }
};

export const createComplexData = async (req: Request, res: Response) => {
  try {
    const { admin_id, name, location, description, image_url } = req.body;

    const verifyAdmin = await pool.query(
      `SELECT * FROM Account WHERE id = $1 AND account_type = 'admin'`,
      [admin_id]
    );

    if (verifyAdmin.rows.length === 0) {
      return res
        .status(400)
        .json({ message: "Account not found or is not an admin" });
    }

    const newComplex = await pool.query(
      `INSERT INTO Complex (admin_id, name, location, description, image_url) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [admin_id, name, location, description, image_url]
    );

    return res.status(201).json({
      message: "Complex created successfully",
      data: newComplex.rows[0],
    });
  } catch (error) {
    const err = error as Error;
    return res
      .status(500)
      .json({ message: "An error occurred", error: err.message });
  }
};

export const deleteComplexData = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const complex = await pool.query(`SELECT * FROM Complex WHERE id = $1`, [
      id,
    ]);

    if (complex.rows.length === 0) {
      return res.status(404).json({ message: "Complex not found" });
    }

    await pool.query(`DELETE FROM Complex WHERE id = $1`, [id]);

    return res.status(200).json({ message: "Complex deleted successfully" });
  } catch (error) {
    const err = error as Error;
    return res
      .status(500)
      .json({ message: "An error occurred", error: err.message });
  }
};

export const updateComplexData = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, location, description, image_url } = req.body;
  try {
    const complex = await pool.query(`SELECT * FROM Complex WHERE id = $1`, [
      id,
    ]);

    if (complex.rows.length === 0) {
      return res.status(404).json({ message: "Complex not found" });
    }

    const fields = { name, location, description, image_url };
    const keys = Object.keys(fields).filter(
      (key) => fields[key as keyof typeof fields] !== undefined
    );

    if (keys.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }
    const setClause = keys.map((key, idx) => `${key} = $${idx + 1}`).join(", ");
    const values = keys.map((key) => fields[key as keyof typeof fields]);

    const query = `UPDATE Complex SET ${setClause} WHERE id = $${
      keys.length + 1
    } RETURNING *`;

    const result = await pool.query(query, [...values, id]);
    res
      .status(200)
      .json({ message: "Complex updated successfully", data: result.rows[0] });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export default {
  getComplexData,
  createComplexData,
  deleteComplexData,
  updateComplexData,
};
