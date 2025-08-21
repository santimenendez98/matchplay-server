export interface PaymentModel {
  id: string;
  reservation_id: string;
  token: string;
  amount: number;
  description: string;
  payment_method: "debit_card" | "credit_card";
}

export interface PaymentReservationBody {
  account_id: string;
  reservation_id: string;
  amount: number;
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
  data: {
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
  };
}

export interface PaymentHistory {
  user_id: string;
  reservation_id: string;
  amount: number;
  payment_method: "debit card" | "cash" | "bank_transfer";
  payment_status: "pending" | "completed" | "failed";
  payment_date: string;
  paid_by: string;
}

export type SavePaymentModel = Pick<PaymentModel, "id" | "token">;

export interface CreateCustomer {
  email: string;
}

export type CreateCustomerResponse = {
  message: string;
  data: Pick<PaymentModel, "id">;
};
