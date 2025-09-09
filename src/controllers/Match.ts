import { Request, Response } from "express";
import { errorResponseModel, paramsModels } from "../types";
import {
  MatchGetModelSuccess,
  MatchModelSuccess,
  JoinMatchModel,
  JoinMatchModelSuccess,
  SendMessageModel,
  sendMatchMessageModelSuccess,
} from "../types/Match";
import {
  deleteMatchQuery,
  getMatchByIdQuery,
  joinMatchQuery,
  getCantPlayersByScheduleQuery,
  updatePlayersCountQuery,
  updateStatusMatchQuery,
  getPlayerJoinedByMatchQuery,
  getMatchesQuery,
  quitMatchQuery,
  sendMessageToMatchQuery,
  getMessagesByMatchQuery,
} from "../db/MatchQueries";
import { getAccountByIdQuery } from "../db/AccountQueries";
import {
  deleteReservationQuery,
  updatePreReserveStatusQuery,
  updateReservationStatusQuery,
} from "../db/ReservationQueries";
import { getCurrentTime } from "../services/addMinutes";
import { emitMessageToMatch } from "../services/webSocket";

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
  req: Request<{}, {}, JoinMatchModel>,
  res: Response<JoinMatchModelSuccess | errorResponseModel>
) => {
  try {
    const { match_id, player_id } = req.body;
    const joined_at = getCurrentTime();

    const match = await getMatchByIdQuery(match_id);
    const player = await getAccountByIdQuery(player_id);
    const cantPlayers = await getCantPlayersByScheduleQuery(match_id);
    const findPlayer = await getPlayerJoinedByMatchQuery(match_id, player_id);

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
        await updatePreReserveStatusQuery(match_id, "confirmed");
        await updateReservationStatusQuery(
          match.rows[0].reservation_id,
          "confirmed"
        );
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
  req: Request<{}, {}, JoinMatchModel>,
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

export const sendMessageToMatch = async (
  req: Request<{}, {}, SendMessageModel>,
  res: Response<sendMatchMessageModelSuccess | errorResponseModel>
) => {
  try {
    const { match_id, player_id, message } = req.body;

    const match = await getMatchByIdQuery(match_id);
    const account = await getAccountByIdQuery(player_id);

    if (match.rowCount === 0) {
      return res
        .status(404)
        .json({ message: "An error ocurred", error: "Match not found" });
    }

    if (account.rowCount === 0) {
      return res
        .status(404)
        .json({ message: "An error ocurred", error: "Player not found" });
    }

    const messageData: SendMessageModel = {
      match_id,
      player_id,
      message,
      sent_at: getCurrentTime(),
    };

    const result = await sendMessageToMatchQuery(messageData);
    emitMessageToMatch(messageData);

    res.status(200).json({
      message: "Message sent successfully",
      data: result.rows[0],
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export const historyChatMatch = async (
  req: Request<paramsModels>,
  res: Response<sendMatchMessageModelSuccess | errorResponseModel>
) => {
  try {
    const { id } = req.params;

    const messages = await getMessagesByMatchQuery(id);

    if (messages.rowCount === 0) {
      return res.status(404).json({
        message: "No chat history found",
        error: "Chat history not found",
      });
    }

    res.status(200).json({
      message: "Chat history retrieved successfully",
      data: messages.rows,
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};
