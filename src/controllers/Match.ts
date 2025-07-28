import { Request, Response } from "express";
import { errorResponseModel, paramsModels } from "../types";
import {
  MatchGetModelSuccess,
  MatchModelSuccess,
  JoinMatchModel,
  JoinMatchModelSuccess,
} from "../types/Match";
import {
  deleteMatchQuery,
  getMatchByIdQuery,
  joinMatchQuery,
  getCantPlayersByMatchQuery,
  updatePlayersCountQuery,
  updateStatusMatchQuery,
  getPlayersJoinedByMatchQuery,
  getMatchesQuery,
  quitMatchQuery,
  getMatchPlayerById,
  deleteMatchPlayerQuery,
} from "../db/MatchQueries";
import { getAccountByIdQuery } from "../db/AccountQueries";
import {
  deleteReservationQuery,
  getReservationWithIdQuery,
} from "../db/ReservationQueries";
import { updateScheduleAvailable } from "../db/ScheduleCourtQueries";

export const getMatches = async (
  req: Request,
  res: Response<MatchModelSuccess | errorResponseModel>
) => {
  try {
    const result = await getMatchesQuery();
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

export const joinMatch = async (
  req: Request<JoinMatchModel>,
  res: Response<JoinMatchModelSuccess | errorResponseModel>
) => {
  try {
    const { match_id, player_id } = req.body;
    const joined_at = new Date();

    const match = await getMatchByIdQuery(match_id);
    const player = await getAccountByIdQuery(player_id);
    const cantPlayers = await getCantPlayersByMatchQuery(match_id);
    const findPlayer = await getPlayersJoinedByMatchQuery(match_id, player_id);

    if (match.rowCount === 0) {
      return res
        .status(404)
        .json({ message: "An error ocurred", error: "Match not found" });
    }

    if (player.rowCount === 0) {
      return res
        .status(404)
        .json({ message: "An error ocurred", error: "Player not found" });
    }

    if (cantPlayers.rowCount === 0) {
      return res
        .status(404)
        .json({ message: "An error ocurred", error: "Match not found" });
    }

    // Check if the player is already joined to the match
    if (findPlayer.rowCount! > 0) {
      return res.status(400).json({
        message: "An error ocurred",
        error: "Player already joined this match",
      });
    }

    // Check if the match is already full
    if (match.rows[0].status === "completed") {
      return res.status(400).json({
        message: "An error ocurred",
        error: "Cannot join match, maximum players reached",
      });
    } else {
      // Increment the current players count in the match
      const updatePlayer = await updatePlayersCountQuery("1", match_id);

      // If the match is full, update its status to completed
      if (
        updatePlayer.rows[0].current_players === cantPlayers.rows[0].max_players
      ) {
        await updateStatusMatchQuery(match_id, "completed");
      }

      const joinData = await joinMatchQuery(match_id, player_id, joined_at);

      res.status(200).json({
        message: "Player joined match successfully",
        data: joinData.rows[0],
      });
    }
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export const leaveMatch = async (
  req: Request<JoinMatchModel>,
  res: Response<JoinMatchModelSuccess | errorResponseModel>
) => {
  try {
    const { match_id, player_id } = req.body;
    const match = await getMatchByIdQuery(match_id);

    if (match.rowCount === 0) {
      return res
        .status(404)
        .json({ message: "An error ocurred", error: "Match not found" });
    }

    if (match.rows[0].creator_id === player_id) {
      return res.status(404).json({
        message: "An error ocurred",
        error: "The Creator Match cannot leave, he must cancel it",
      });
    }

    if (match.rows[0].status === "completed") {
      return res.status(400).json({
        message: "An error ocurred",
        error: "Cannot leave match, it is already completed",
      });
    }

    const updatePlayer = await updatePlayersCountQuery("-1", match_id);

    const leaveData = await quitMatchQuery(match_id, player_id);

    if (updatePlayer.rows[0].current_players === 0) {
      await deleteMatchQuery(match_id);
      await deleteReservationQuery(match.rows[0].reservation_id);
    }

    res.status(200).json({
      message: "Player left match successfully",
      data: leaveData.rows[0],
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};
