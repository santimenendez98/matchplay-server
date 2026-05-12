import pool from "../db/connection";
import { SportModel } from "../types/Sport";

export const getAllSportsQuery = () =>
  pool.query<SportModel>(`SELECT * FROM Sport ORDER BY id ASC`);

export const getSportByIdQuery = (id: number | string) =>
  pool.query<SportModel>(`SELECT * FROM Sport WHERE id = $1`, [id]);

export const createSportQuery = (name: string, max_players: number) =>
  pool.query<SportModel>(
    `INSERT INTO Sport (name, max_players) VALUES ($1, $2) RETURNING *`,
    [name.toLowerCase(), max_players]
  );

export const deleteSportQuery = (id: number) =>
  pool.query<SportModel>(`DELETE FROM Sport WHERE id = $1 RETURNING *`, [id]);

export const getSportByReservation = (reservation_id: string) => {
  return pool.query<SportModel>(`SELECT * FROM Sport`);
};
