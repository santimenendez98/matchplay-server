export interface WeekPriceModel {
  id?: string;
  week_schedule_id: string;
  hourprice: number;
  halfprice: number;
}

export interface WeekPriceModelSuccess {
  message: string;
  data: WeekPriceModel[];
}

export interface WeekPriceGetModelSuccess {
  message: string;
  data: WeekPriceModel;
}

export type updateWeekPriceModel = Pick<
  WeekPriceModel,
  "week_schedule_id" | "hourprice" | "halfprice"
>;

export type DayPriceModel = Omit<WeekPriceModel, "week_schedule_id"> & {
  schedule_id: string;
};

export type DayPriceModelSuccess = Omit<WeekPriceModelSuccess, "data"> & {
  data: DayPriceModel[];
};

export type DayPriceGetModelSuccess = Omit<WeekPriceGetModelSuccess, "data"> & {
  data: DayPriceModel;
};

export type updateDayPriceModel = Pick<
  DayPriceModel,
  "schedule_id" | "hourprice" | "halfprice"
>;
