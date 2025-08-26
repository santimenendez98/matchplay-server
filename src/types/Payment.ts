export interface PaymentModel {
  id: string;
  token: string;
  amount: number;
  description: string;
}

export interface PaymentReservationBody {
  account_id: string;
  paid_by?: string;
  reservation_id: string;
  payment_data: GenerateTokenModel;
}

export interface GenerateTokenModel {
  card_number: string;
  expiration_month: number;
  expiration_year: number;
  security_code: string;
  cardholder: {
    name: string;
    identification: {
      type: string;
      number: string;
    };
  };
}

export interface GenerateTokenResponse {
  id: string;
  first_six_digits: string;
  expiration_month: number;
  expiration_year: number;
  last_four_digits: string;
  cardholder: {
    name: string;
  };
}

export interface TokenSuccessResponse {
  message: string;
  data: GenerateTokenResponse;
}

export interface PaymentReservationResponse {
  message: string;
  data: responsePayment;
}

export interface PaymentHistory {
  user_id: string;
  reservation_id: string;
  amount: number;
  payment_status: "pending" | "completed" | "failed";
  payment_date: string;
  paid_by: string;
}

export type DebitPaymentHistory = PaymentHistory & {
  payment_method: "debit card";
  mp_payment_id: string;
};

export type SavePaymentModel = Pick<PaymentModel, "id" | "token">;

export interface CreateCustomer {
  email: string;
}

export type CreateCustomerResponse = {
  message: string;
  data: Pick<PaymentModel, "id">;
};

export interface responsePayment {
  id: string;
  status:
    | "pending"
    | "approved"
    | "authorized"
    | "in_process"
    | "in_mediation"
    | "rejected"
    | "cancelled"
    | "refunded"
    | "charged_back";
  payment_method: string;
}
