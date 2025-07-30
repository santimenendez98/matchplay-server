import cron from "node-cron";
import {
  getReservationWithIdQuery,
  updateExpiredPreReservesQuery,
  updateReservationStatusQuery,
} from "../db/ReservationQueries";
import {
  deleteMatchPlayerQuery,
  getMatchByIdQuery,
  updateStatusMatchQuery,
} from "../db/MatchQueries";
import { updateScheduleAvailable } from "../db/ScheduleCourtQueries";
import { getCurrentTime } from "../services/addMinutes";

export const handleExpiredPreReserves = () => {
  cron.schedule("*/1 * * * *", async () => {
    try {
      const currentTime = getCurrentTime();

      // Get expired pre-reservations
      const expiredPreReserves = await updateExpiredPreReservesQuery(
        currentTime
      );

      for (const preReserve of expiredPreReserves.rows) {
        const matchId = preReserve.match_id;
        if (!matchId) continue;

        // Get match details
        const matchResult = await getMatchByIdQuery(matchId);
        const match = matchResult.rows[0];
        if (!match) continue;

        // Cancel the match and update its status
        await updateStatusMatchQuery(matchId, "cancelled");

        const reservationId = match.reservation_id;
        if (!reservationId) continue;

        // Delete the match player entries
        await deleteMatchPlayerQuery(matchId);

        // Get reservation details
        const reservationResult = await getReservationWithIdQuery(
          reservationId
        );
        const reservation = reservationResult.rows[0];
        if (!reservation) continue;

        // Cancel reservation and update schedule availability
        await updateReservationStatusQuery(reservationId, "cancelled");
        await updateScheduleAvailable(
          match.court_id,
          reservation.start_time,
          reservation.end_time
        );
      }
      console.log("Expired pre-reservations processed successfully.");
    } catch (error) {
      const err = error as Error;
      console.error("Error in pre-reserve cron job:", err.message);
    }
  });
};

export default handleExpiredPreReserves;
