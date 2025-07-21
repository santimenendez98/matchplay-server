import pool from "../db/connection";
import { DayPriceModel } from "../types/Price";

export const getAllDayPriceQuery = () =>
  pool.query<DayPriceModel>(`SELECT * FROM ScheduleCourtPrice`);

export const createDayPriceQuery = (dayPrice: DayPriceModel) =>
  pool.query<DayPriceModel>(
    `INSERT INTO ScheduleCourtPrice (schedule_id, hourPrice, halfPrice) 
     VALUES ($1, $2, $3) RETURNING *`,
    [dayPrice.schedule_id, dayPrice.hourPrice, dayPrice.halfPrice]
  );

export const updateDayPriceQuery = (query: string, values: any[]) =>
  pool.query<DayPriceModel[]>(query, values);

export const deleteDayPriceQuery = (id: string) =>
  pool.query(`DELETE FROM ScheduleCourtPrice WHERE id = $1`, [id]);
