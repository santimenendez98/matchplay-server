import { addMinutes } from "date-fns";
import { toZonedTime, format } from "date-fns-tz";

export const addMinutesToTime = (
  time: string,
  minutesToAdd: number
): string => {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes);
  date.setMinutes(date.getMinutes() + minutesToAdd);

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

export default {
  addMinutesToTime,
  timeToMinutes,
  getNext1Hour,
  getCurrentTime,
};
