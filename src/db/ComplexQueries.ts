import pool from "./connection";
import { complexModel } from "../types/Complex";

export const getAllComplexesQuery = () =>
  pool.query<complexModel>(`SELECT * FROM Complex`);

export const getComplexByIdQuery = (id: number | string) =>
  pool.query<complexModel>(`SELECT * FROM Complex WHERE id = $1`, [id]);

export const createComplexQuery = (complex: complexModel) =>
  pool.query<complexModel>(
    `INSERT INTO Complex (admin_id, name, location, description, image_url) 
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [
      complex.admin_id,
      complex.name,
      complex.location,
      complex.description,
      complex.image_url,
    ]
  );

export const deleteComplexQuery = (id: number | string) =>
  pool.query(`DELETE FROM Complex WHERE id = $1`, [id]);

export const updateComplexQuery = (query: string, values: any[]) =>
  pool.query<complexModel[]>(query, values);
