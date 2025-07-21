import pool from "../db/connection";
import { WeekPriceModel } from "../types/Price";

export const getAllWeekPriceQuery = () =>
  pool.query<WeekPriceModel>(`SELECT * FROM WeekScheduleCourtPrice`);

export const createWeekPriceQuery = (weekPrice: WeekPriceModel) =>
  pool.query<WeekPriceModel>(
    `INSERT INTO WeekScheduleCourtPrice (week_schedule_id, hourPrice, halfPrice) 
     VALUES ($1, $2, $3) RETURNING *`,
    [weekPrice.week_schedule_id, weekPrice.hourPrice, weekPrice.halfPrice]
  );

export const updateWeekPriceQuery = (query: string, values: any[]) =>
  pool.query<WeekPriceModel[]>(query, values);

export const deleteWeekPriceQuery = (id: string) =>
  pool.query(`DELETE FROM WeekScheduleCourtPrice WHERE id = $1`, [id]);
