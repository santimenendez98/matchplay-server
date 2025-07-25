export interface WeekScheduleCourtModel {
  id?: string;
  court_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  hourprice: number;
  halfprice: number;
}

export interface WeekScheduleCourtModelSuccess {
  message: string;
  data: WeekScheduleCourtModel[];
}

export interface WeekScheduleCourtGetModelSuccess {
  message: string;
  data: WeekScheduleCourtModel;
}

export type updateWeekScheduleCourtModel = Pick<
  WeekScheduleCourtModel,
  | "court_id"
  | "day_of_week"
  | "start_time"
  | "end_time"
  | "hourprice"
  | "halfprice"
>;
