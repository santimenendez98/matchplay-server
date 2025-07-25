import pool from "../db/connection";
import { DayPriceModel } from "../types/Price";

export const getAllDayPriceQuery = () =>
  pool.query<DayPriceModel>(`SELECT * FROM ScheduleCourtPrice`);

export const createDayPriceQuery = (dayPrice: DayPriceModel) =>
  pool.query<DayPriceModel>(
    `INSERT INTO ScheduleCourtPrice (schedule_id, hourprice, halfprice) 
     VALUES ($1, $2, $3) RETURNING *`,
    [dayPrice.schedule_id, dayPrice.hourprice, dayPrice.halfprice]
  );

export const updateDayPriceQuery = (query: string, values: any[]) =>
  pool.query<DayPriceModel[]>(query, values);

export const deleteDayPriceQuery = (id: string) =>
  pool.query(`DELETE FROM ScheduleCourtPrice WHERE id = $1`, [id]);

export const getPriceForReservationQuery = (schedule_id: string) =>
  pool.query(`SELECT * FROM ScheduleCourtPrice WHERE schedule_id = $1`, [
    schedule_id,
  ]);
