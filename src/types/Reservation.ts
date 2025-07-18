export interface ReservationModel {
  id?: string;
  schedule_id: string;
  account_id: string;
  price: number;
  start_time: string;
  end_time: string;
  time_reserved: number;
  reservation_date: string;
  status: ["pending" | "confirmed" | "cancelled"];
}

export interface ReservationModelSuccess {
  message: string;
  data: ReservationModel[];
}

export interface ReservationGetModelSuccess {
  message: string;
  data: ReservationModel;
}

export type updateReservationModel = Pick<
  ReservationModel,
  "schedule_id" | "account_id" | "price" | "start_time" | "end_time" | "status"
>;
