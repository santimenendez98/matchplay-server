import { MercadoPagoConfig, Customer } from "mercadopago";
import {
  CreateCustomer,
  DebitPaymentHistory,
  GenerateTokenModel,
  GenerateTokenResponse,
  PaymentModel,
  responsePayment,
  SavePaymentModel,
} from "../types/Payment";
import {
  getCantPlayersByScheduleQuery,
  getMatchByReservationQuery,
} from "../db/MatchQueries";
import {
  savePaymentHistoryQuery,
  verifyUserPaidReservationQuery,
} from "../db/ReservationQueries";

// Initialize MercadoPago with your access token
const mercadopago = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || "",
});

// Create a new customer in MercadoPago
export const createCustomer = async (data: CreateCustomer) => {
  try {
    const customer = await new Customer(mercadopago).create({
      body: {
        email: data.email,
      },
    });

    if (!customer) {
      throw new Error("Failed to create customer");
    }

    if (customer.id) {
      const response = {
        id: customer.id,
      };
      return response;
    }
  } catch (error) {
    console.error("Error creating customer:", error);
    throw error;
  }
};

// Save a payment method for a customer
export const savePayment = async (data: SavePaymentModel) => {
  try {
    const { id, token } = data;
    const response = await fetch(
      `https://api.mercadopago.com/v1/customers/${id}/cards`,
      {
        method: "POST",
        body: JSON.stringify({
          token: token,
        }),
        headers: {
          Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to save payment method");
    }

    return response.json();
  } catch (error) {
    console.error("Error saving payment:", error);
    throw error;
  }
};

// Create a payment in MercadoPago
export const createPayment = async (data: PaymentModel) => {
  try {
    const { id, token, amount, description } = data;
    const payment = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
        "X-Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        transaction_amount: amount,
        installments: 1,
        description: description,
        payer: {
          type: "customer",
          id: id,
        },
        token: token,
      }),
    });

    const paymentResponse = await payment.json();

    if (!payment.ok) {
      throw new Error(paymentResponse.message);
    }

    const response: responsePayment = {
      id: paymentResponse.id,
      status: paymentResponse.status,
      payment_method: paymentResponse.payment_method.id,
    };

    return response;
  } catch (error) {
    console.error("Error creating payment:", error);
    throw error;
  }
};

// Get a customer by email
export const getCustomer = async (email: string) => {
  try {
    const customer = await fetch(
      `https://api.mercadopago.com/v1/customers/search?email=${email}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
        },
      }
    );

    if (!customer) {
      throw new Error("Customer not found");
    }

    const response = await customer.json();
    const data = response.results[0];

    return data;
  } catch (error) {
    console.error("Error getting customer:", error);
    throw error;
  }
};

// Generate a token
export const getToken = async (paymentData: GenerateTokenModel) => {
  try {
    const token = await fetch("https://api.mercadopago.com/v1/card_tokens", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paymentData, null, 2),
    });

    if (!token.ok) {
      throw new Error("Failed to generate token");
    }

    const response = await token.json();

    const data: GenerateTokenResponse = {
      id: response.id,
      first_six_digits: response.first_six_digits,
      expiration_month: response.expiration_month,
      expiration_year: response.expiration_year,
      last_four_digits: response.last_four_digits,
      cardholder: {
        name: response.cardholder.name,
      },
    };

    return data;
  } catch (error) {
    console.error("Error generating token:", error);
    throw error;
  }
};

// Process payment with debit card
export const processDebitPayment = async (
  customer_id: string,
  token: { id: string },
  amount: number,
  reservation_id: string,
  today: string,
  account_id: string,
  paid_by?: string
) => {
  const data = {
    id: customer_id,
    token: token.id,
    amount,
    description: `Reservation id ${reservation_id} for ${today}`,
  };

  const paymentResponse = await createPayment(data);

  if (paymentResponse.status !== "approved") {
    throw new Error("PAYMENT_NOT_APPROVED");
  }

  if (paymentResponse.payment_method.slice(0, 3) !== "deb") {
    throw new Error("ONLY_DEBIT_ALLOWED");
  }

  const dataPayment: DebitPaymentHistory = {
    user_id: account_id,
    reservation_id,
    amount,
    payment_status: "completed",
    payment_method: "debit card",
    payment_date: today,
    paid_by: paid_by ?? account_id,
    mp_payment_id: paymentResponse.id,
  };

  await savePaymentHistoryQuery(dataPayment);

  return paymentResponse;
};

// Handle payment flow when reservation is a match.
export const handleMatchPayment = async (
  reservation: any,
  reservation_id: string,
  account_id: string,
  customer_id: string,
  token: { id: string },
  today: string,
  paid_by?: string
) => {
  const match = await getMatchByReservationQuery(reservation_id);
  if (match.rows.length === 0) {
    throw new Error("MATCH_NOT_FOUND");
  }

  if (match.rows[0].status !== "completed") {
    throw new Error(`MATCH_STATUS_${match.rows[0].status?.toUpperCase()}`);
  }

  // Verify if user already paid
  const verifyUserPaid = await verifyUserPaidReservationQuery(
    account_id,
    reservation_id
  );
  if (verifyUserPaid.rows.length > 0) {
    throw new Error("USER_ALREADY_PAID");
  }

  // Amount to be paid is the price per player
  const matchPrice = Number(match.rows[0].price_per_player);

  // Process payment
  const paymentResponse = await processDebitPayment(
    customer_id,
    token,
    matchPrice,
    reservation_id,
    today,
    account_id,
    paid_by
  );

  return paymentResponse;
};
