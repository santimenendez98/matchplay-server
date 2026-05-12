import pool from "./connection";
import { CourtModel } from "../types/Court";

export const getAllCourtQuery = (limit = 50, offset = 0) =>
  pool.query<CourtModel>(
    `SELECT * FROM Court ORDER BY id ASC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

export const getCourtByIdQuery = (id: string) =>
  pool.query<CourtModel>(`SELECT * FROM Court WHERE id = $1`, [id]);

export const getCourtsByComplexQuery = (complex_id: string) =>
  pool.query<CourtModel>(
    `SELECT * FROM Court WHERE complex_id = $1 ORDER BY id ASC`,
    [complex_id]
  );

export const createCourtQuery = (court: CourtModel) =>
  pool.query<CourtModel>(
    `INSERT INTO Court (complex_id, sport_id, name, image_url) 
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [court.complex_id, court.sport_id, court.name, court.image_url]
  );

export const deleteCourtQuery = (id: string) =>
  pool.query(`DELETE FROM Court WHERE id = $1`, [id]);

export const updateCourtQuery = (query: string, values: any[]) =>
  pool.query<CourtModel[]>(query, values);
