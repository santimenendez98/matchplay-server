import { ParamsDictionary } from "express-serve-static-core";

export interface scheduleDayModel {
  id?: number | string;
  court_id: number;
  schedule_date: string;
  start_time: string;
  end_time: string;
  price: number;
  is_available: boolean;
}

export interface scheduleDayModelSuccess {
  message: string;
  data: scheduleDayModel[];
}

export type scheduleDeleteModelSuccess = {
  message: string;
  data: scheduleDayModel;
};

export interface scheduleDayModelError {
  message: string;
  error: string;
}

export interface scheduleDayParams extends ParamsDictionary {
  id: string;
}

export type updateScheduleDayModel = Pick<
  scheduleDayModel,
  "id" | "court_id" | "start_time" | "end_time" | "price" | "is_available"
>;

export type createScheduleDayModel = Omit<
  scheduleDayModel,
  "id" | "is_available"
>;

export interface schedulePostDayModelSuccess {
  message: string;
  data: Omit<scheduleDayModel, "is_available">;
}
