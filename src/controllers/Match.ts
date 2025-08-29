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
  updatePlayersCountQuery,
  updateStatusMatchQuery,
  getMatchesQuery,
  quitMatchQuery,
  sendMessageToMatchQuery,
  getMessagesByMatchQuery,
  getPlayerJoinedByMatchQuery,
} from "../db/MatchQueries";
import { getAccountByIdQuery } from "../db/AccountQueries";
import {
  deleteReservationQuery,
  getReservationWithIdQuery,
  updatePreReserveStatusQuery,
  updateReservationStatusQuery,
} from "../db/ReservationQueries";
import {
  addOrRemoveMinutresToTime,
  getCurrentTime,
  getDateOnly,
} from "../services/addMinutes";
import { emitMessageToMatch } from "../services/webSocket";

// Get all matches
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

// Delete a match
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

// Player joins a match
export const joinMatch = async (
  req: Request<{}, {}, JoinMatchModel>,
  res: Response<JoinMatchModelSuccess | errorResponseModel>
) => {
  try {
    const { match_id, player_id } = req.body;
    const joined_at = getCurrentTime();

    const match = await getMatchByIdQuery(match_id);
    const player = await getAccountByIdQuery(player_id);
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

    // Check if the player is already joined to the match
    if (findPlayer.rowCount! > 0) {
      return res.status(400).json({
        message: "An error ocurred",
        error: "Player already joined this match",
      });
    }

    // Check if the match is already full
    if (match.rows[0].status !== "pending") {
      return res.status(400).json({
        message: "An error ocurred",
        error: `Cannot join match, the match is ${match.rows[0].status}`,
      });
    }

    // Increment the current players count in the match
    const updatePlayer = await updatePlayersCountQuery("1", match_id);

    // If the match is full, update its status to completed
    if (
      updatePlayer.rows[0].current_players ===
      updatePlayer.rows[0].total_players
    ) {
      await updateStatusMatchQuery(match_id, "completed");
      await updateReservationStatusQuery(
        match.rows[0].reservation_id,
        "confirmed"
      );
      await updatePreReserveStatusQuery(
        match.rows[0].reservation_id,
        "confirmed"
      );
    }

    const joinData = await joinMatchQuery(match_id, player_id, joined_at);

    res.status(200).json({
      message: "Player joined match successfully",
      data: joinData.rows[0],
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

// Player leaves a match
export const leaveMatch = async (
  req: Request<{}, {}, JoinMatchModel>,
  res: Response<JoinMatchModelSuccess | errorResponseModel>
) => {
  try {
    const { match_id, player_id } = req.body;
    const match = await getMatchByIdQuery(match_id);
    const today = getCurrentTime();

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

    if (match.rows[0].status !== "pending") {
      return res.status(400).json({
        message: "An error ocurred",
        error: `Cannot leave match, the match is ${match.rows[0].status}`,
      });
    }

    const reservation = await getReservationWithIdQuery(
      match.rows[0].reservation_id
    );

    if (reservation.rowCount === 0) {
      return res.status(404).json({
        message: "An error ocurred",
        error: "Reservation not found",
      });
    }

    const convertedReservationDate = getDateOnly(
      reservation.rows[0].reservation_date
    );
    const convertedToday = getDateOnly(today);

    if (
      reservation.rows[0].start_time >
        addOrRemoveMinutresToTime(today, "-", 60) &&
      convertedReservationDate === convertedToday
    ) {
      return res.status(400).json({
        message: "An error ocurred",
        error:
          "Cannot leave match within 1 hour of the reservation time, you must request for leave",
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

// Player sends a message to the match chat
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

// Get chat history of a match
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
