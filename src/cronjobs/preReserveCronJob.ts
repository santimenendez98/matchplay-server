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
import logger from "../services/logger";

// Core implementation, callable from either node-cron or an HTTP endpoint.
export const runExpiredPreReservesJob = async () => {
  const currentTime = getCurrentTime();
  const expiredPreReserves = await updateExpiredPreReservesQuery(currentTime);
  let processed = 0;

  for (const preReserve of expiredPreReserves.rows) {
    const matchId = preReserve.match_id;
    if (!matchId) continue;

    const matchResult = await getMatchByIdQuery(matchId);
    const match = matchResult.rows[0];
    if (!match) continue;

    await updateStatusMatchQuery(matchId, "cancelled");

    const reservationId = match.reservation_id;
    if (!reservationId) continue;

    await deleteMatchPlayerQuery(matchId);

    const reservationResult = await getReservationWithIdQuery(reservationId);
    const reservation = reservationResult.rows[0];
    if (!reservation) continue;

    await updateReservationStatusQuery(reservationId, "cancelled");
    await updateScheduleAvailable(
      match.court_id,
      reservation.start_time,
      reservation.end_time
    );
    processed++;
  }
  logger.info({ processed }, "Expired pre-reservations processed");
  return { processed };
};

export const handleExpiredPreReserves = () => {
  cron.schedule("*/5 * * * *", async () => {
    try {
      await runExpiredPreReservesJob();
    } catch (error) {
      const err = error as Error;
      logger.error({ err: err.message }, "Error in pre-reserve cron job");
    }
  });
};

export default handleExpiredPreReserves;
