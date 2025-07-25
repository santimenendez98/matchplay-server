import pool from "./connection";
import { MatchModel } from "../types/Match";

export const createMatchQuery = async (match: MatchModel) => {
  return pool.query<MatchModel>(
    `INSERT INTO Match (court_id, creator_id, reservation_id, status) 
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [match.court_id, match.creator_id, match.reservation_id, "pending"]
  );
};

export const deleteMatchQuery = async (id: string) => {
  return pool.query(`DELETE FROM Match WHERE id = $1`, [id]);
};

export const deleteMatchByReservationIdQuery = async (
  reservation_id: string
) => {
  return pool.query(`DELETE FROM Match WHERE reservation_id = $1`, [
    reservation_id,
  ]);
};
