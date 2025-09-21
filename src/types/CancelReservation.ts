export interface CancelReservationModel {
  id?: string;
  reservation_id: string;
  requested_by: string;
  reason: string;
  cancel_status: "pending" | "approved" | "rejected";
  requested_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
}

export interface CancelModel {
  id?: string;
  reservation_id: string;
  match_id?: string;
  canceled_by: string;
  cancelation_reason?: string;
  cancelation_date: string;
}

export type BodyCancelModel = Pick<
  CancelModel,
  "reservation_id" | "canceled_by"
>;

export type BodyCancelPreReserveModel = Omit<
  CancelModel,
  "id" | "cancelation_date" | "cancelation_reason " | "match_id"
>;

export type CancelReservationRequestModel = Pick<
  CancelReservationModel,
  "requested_by" | "reason" | "reservation_id"
> & {
  requested_at?: CancelReservationModel["requested_at"];
};

export interface CancelReservationModelSuccess {
  message: string;
  data: CancelReservationModel;
}
