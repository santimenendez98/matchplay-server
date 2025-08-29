import pool from "./connection";
import { JoinMatchModel, MatchModel, SendMessageModel } from "../types/Match";

/*
------------ MATCH ---------------
*/

export const getMatchesQuery = async () => {
  return pool.query<MatchModel>("SELECT * FROM Match");
};

export const createMatchQuery = async (match: MatchModel) => {
  return pool.query<MatchModel>(
    `INSERT INTO Match (court_id, creator_id, reservation_id, status, current_players, total_players, price_per_player) 
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      match.court_id,
      match.creator_id,
      match.reservation_id,
      "pending",
      1,
      match.total_players,
      match.price_per_player,
    ]
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

export const getMatchByIdQuery = async (id: string) => {
  return pool.query<MatchModel>(`SELECT * FROM Match WHERE id = $1`, [id]);
};

export const updatePlayersCountQuery = async (
  number: string,
  match_id: string
) => {
  return pool.query<MatchModel>(
    `UPDATE Match SET current_players = current_players + $1 WHERE id = $2 RETURNING *`,
    [number, match_id]
  );
};

export const updateStatusMatchQuery = async (
  match_id: string,
  status: string
) => {
  return pool.query<MatchModel>(
    `UPDATE Match SET status = $1 WHERE id = $2 RETURNING *`,
    [status, match_id]
  );
};

export const getCantPlayersByScheduleQuery = async (schedule_id: string) => {
  return pool.query(
    `SELECT max_players FROM Sport s
    JOIN Court c ON s.id = c.sport_id
    JOIN ScheduleCourt sch ON c.id = sch.court_id
    WHERE sch.id = $1`,
    [schedule_id]
  );
};

export const getMatchByReservationQuery = async (reservation_id: string) => {
  return pool.query<MatchModel>(
    `SELECT * FROM Match WHERE reservation_id = $1`,
    [reservation_id]
  );
};

/*
----------- MatchPlayer --------------
*/

export const joinMatchQuery = async (
  match_id: string,
  player_id: string,
  joined_at: string
) => {
  return pool.query(
    `INSERT INTO MatchPlayer (match_id, player_id, joined_at) 
     VALUES ($1, $2, $3) RETURNING *`,
    [match_id, player_id, joined_at]
  );
};

export const quitMatchQuery = async (match_id: string, player_id: string) => {
  return pool.query(
    `DELETE FROM MatchPlayer WHERE match_id = $1 AND player_id = $2`,
    [match_id, player_id]
  );
};

export const getMatchPlayerById = async (id: string) => {
  return pool.query<JoinMatchModel>(
    `SELECT * FROM MatchPlayer WHERE match_id = $1`,
    [id]
  );
};

export const deleteMatchPlayerQuery = async (match_id: string) => {
  return pool.query(`DELETE FROM MatchPlayer WHERE match_id = $1 RETURNING *`, [
    match_id,
  ]);
};

export const getPlayerJoinedByMatchQuery = async (
  match_id: string,
  player_id: string
) => {
  return pool.query<JoinMatchModel>(
    `SELECT *
    FROM MatchPlayer
    WHERE player_id = $1 AND match_id = $2`,
    [player_id, match_id]
  );
};

export const getAllPlayersByMatchQuery = async (match_id: string) => {
  return pool.query<JoinMatchModel>(
    `SELECT *
    FROM MatchPlayer
    WHERE match_id = $1`,
    [match_id]
  );
};

export const updatePaymentMethod = async (
  match_id: string,
  player_id: string
) => {
  return pool.query(
    `UPDATE MatchPlayer SET payment_method = 'debit card' WHERE match_id = $1 AND player_id = $2`,
    [match_id, player_id]
  );
};

/*
----------- MatchMessage --------------
*/

export const sendMessageToMatchQuery = async (data: SendMessageModel) => {
  return pool.query(
    `INSERT INTO MessageMatch (match_id, sender_id, message_content, date_sent) 
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [data.match_id, data.player_id, data.message, data.sent_at]
  );
};

export const getMessagesByMatchQuery = async (match_id: string) => {
  return pool.query<SendMessageModel>(
    `SELECT * FROM MessageMatch WHERE match_id = $1 ORDER BY date_sent ASC`,
    [match_id]
  );
};
