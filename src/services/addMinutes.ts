import { addMinutes } from "date-fns";
import { toZonedTime, format } from "date-fns-tz";

export const addOrRemoveMinutresToTime = (
  time: string,
  operation: "+" | "-",
  minutesToAdd: number
): string => {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes);
  date.setMinutes(
    date.getMinutes() + (operation === "+" ? minutesToAdd : -minutesToAdd)
  );

  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

export const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

export const getCurrentTime = () => {
  const timeZone = "America/Montevideo";
  const now = new Date();
  const zoneDate = toZonedTime(now, timeZone);
  return format(zoneDate, "yyyy-MM-dd HH:mm:ss", { timeZone });
};

export const getNext1Hour = () => {
  const time = getCurrentTime();
  const newDate = addMinutes(time, 60);

  return format(newDate, "yyyy-MM-dd HH:mm:ss");
};

export function isWithin24Hours(reservationDate: string): boolean {
  const resDate = new Date(reservationDate);
  const current = new Date(getCurrentTime());
  const diffMs = resDate.getTime() - current.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  // true when the reservation is less than 24 hours away (past or future)
  return diffHours <= 24;
}

export function getOnlyDate(date: string) {
  const newDate = new Date(date);
  const formatDate = format(newDate, "yyyy-MM-dd");
  return formatDate;
}

export default {
  addOrRemoveMinutresToTime,
  timeToMinutes,
  getNext1Hour,
  getCurrentTime,
};
