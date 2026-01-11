export interface paymentDataBody {
  reservation_id: string;
  email: string;
}

export interface historyPaymentModel {
  id?: string;
  account_id: string;
  reservation_id: string;
  total_amount: number;
  payment_method: "visa" | "master" | "cash" | "bank_transfer";
  payment_status: "pending" | "completed" | "failed" | "cancelled";
  payment_date: string;
  paid_by: string;
  mp_payment_id?: string;
  proof_of_payment?: string;
}

export interface proofPaymentData {
  mp_payment_id: number;
  status: string;
  date: string;
  amount: number;
  description: string;
  cardholder_name: string;
  email: string;
  payment_method: string;
  last_four_digits: string;
  authorization_code: string;
}

export type MatchPlayerModel = Pick<
  historyPaymentModel,
  "payment_method" | "payment_status"
> & { match_id: string; player_id: string };

export type paymentMethod = "visa" | "master" | "cash" | "bank_transfer";

export interface proofBodyModel {
  payment_id: string;
}

export interface PaymentTransferBody {
  reservation_id: string;
  account_id: string;
  proof_url: string;
}

export interface confirmTransferBody {
  payment_id: string;
  status: "completed" | "failed";
}

export interface PaymentDebitResponse {
  message: string;
  data: {
    url: string;
  };
}

export interface paymentResponse {
  message: string;
  data: historyPaymentModel;
}

export interface PaymentCashBody {
  reservation_id: string;
  account_id: string;
}

export interface refundBody {
  id?: string;
  payment_id: string;
  proof_refund?: string;
  refund_reason?: string;
  refund_status?: "pending" | "completed" | "failed";
  refunded_by?: string;
  refund_date?: string;
}
