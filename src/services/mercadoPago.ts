import { MercadoPagoConfig, Customer } from "mercadopago";
import {
  CreateCustomer,
  GenerateTokenModel,
  GenerateTokenResponse,
  PaymentModel,
  SavePaymentModel,
} from "../types/Payment";

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
    const { id, token, amount, description, payment_method } = data;
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
        payment_method_id: payment_method,
        payer: {
          type: "customer",
          id: id,
        },
        token: token,
      }),
    });

    const response = await payment.json();

    if (!payment.ok) {
      throw new Error(response.message);
    }

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

// Get payment method by BIN
export const getPaymentMethod = async (bin: string) => {
  try {
    const paymentMethods = await fetch(
      `https://api.mercadopago.com/v1/payment_methods/search?bin=${bin}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
        },
      }
    );

    if (!paymentMethods.ok) {
      throw new Error("Failed to retrieve payment methods");
    }

    const data = await paymentMethods.json();

    const cards = data.results.filter(
      (method: any) => method.status === "active"
    );

    return cards.id;
  } catch (error) {
    console.error("Error getting payment method:", error);
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
      body: JSON.stringify(paymentData),
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
