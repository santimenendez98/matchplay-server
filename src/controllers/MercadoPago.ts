import { Request, Response } from "express";
import {
  createCustomer,
  savePayment,
  createPayment,
  getToken,
} from "../services/mercadoPago";
import {
  CreateCustomer,
  CreateCustomerResponse,
  GenerateTokenModel,
  TokenSuccessResponse,
} from "../types/Payment";
import { errorResponseModel } from "../types";

// Add a new customer
export const addCustomer = async (
  req: Request<{}, {}, CreateCustomer>,
  res: Response<CreateCustomerResponse | errorResponseModel>
) => {
  const data = req.body;

  try {
    const customer = await createCustomer(data);

    if (!customer) {
      return res.status(500).json({
        message: "An error ocurred",
        error: "Failed to create customer",
      });
    }

    res.status(201).json({
      message: "Customer created successfully",
      data: customer,
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error ocurred", error: err.message });
  }
};

// Save a payment method for a customer
export const savePaymentMethod = async (req: Request, res: Response) => {
  const { token, customerId } = req.body;

  try {
    const data = { id: customerId, token };
    const paymentMethod = await savePayment(data);
    res.status(201).json(paymentMethod);
  } catch (error) {
    console.error("Error saving payment method:", error);
    res.status(500).json({ error: "Failed to save payment method" });
  }
};

// Process a payment
export const processPayment = async (req: Request, res: Response) => {
  const {
    customerId,
    reservation_id,
    token,
    amount,
    description,
    payment_method,
  } = req.body;

  try {
    const data = {
      id: customerId,
      reservation_id,
      token,
      amount,
      description,
      payment_method,
    };
    const payment = await createPayment(data);
    res.status(201).json(payment);
  } catch (error) {
    console.error("Error processing payment:", error);
    res.status(500).json({ error: "Failed to process payment" });
  }
};

// Generate a token for payment
export const generateToken = async (
  req: Request<{}, {}, GenerateTokenModel>,
  res: Response<TokenSuccessResponse | errorResponseModel>
) => {
  try {
    const token = await getToken(req.body);

    res.status(200).json({
      message: "Token generated successfully",
      data: token,
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error ocurred", error: err.message });
  }
};
