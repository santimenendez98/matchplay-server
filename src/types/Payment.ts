export interface CreatePreferenceBody {
  reservation_id: string;
  email: string;
}

export interface CreatePreferenceInput {
  reservation_id: string;
  amount: number;
  description: string;
  payer_email: string;
  external_reference: string;
}

export interface CreatePreferenceResponse {
  message: string;
  init_point: string;
  preference_id: string;
  payment_id: string;
}

export interface MpWebhookBody {
  id?: string;
  type?: string;
  action?: string;
  data?: { id: string };
  date_created?: string;
  user_id?: string;
}

export interface historyPaymentModel {
  id?: string;
  account_id: string;
  reservation_id: string;
  total_amount: number;
  payment_method: "debit_card" | "cash" | "bank_transfer";
  payment_status: "pending" | "completed" | "failed" | "cancelled";
  payment_date: string;
  paid_by: string;
  mp_payment_id?: string | null;
  mp_preference_id?: string | null;
  mp_status?: string | null;
  mp_status_detail?: string | null;
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
  autorization_code: string;
}

export type proofBodyModel = Pick<proofPaymentData, "mp_payment_id">;

export interface PaymentTransferBody {
  reservation_id: string;
  account_id: string;
  proof_url: string;
}

export interface confirmTransferBody {
  payment_id: string;
  status: "completed" | "failed";
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
