export interface CancelReservationModel {
  id?: string;
  reservation_id: string;
  requested_by: string;
  reason: string;
  cancel_status: ["pending" | "approved" | "rejected"];
  requested_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
}

export type CancelReservationRequestModel = Pick<
  CancelReservationModel,
  "reservation_id" | "requested_by" | "reason"
> & {
  requested_at?: CancelReservationModel["requested_at"];
};

export interface CancelReservationModelSuccess {
  message: string;
  data: CancelReservationModel;
}
