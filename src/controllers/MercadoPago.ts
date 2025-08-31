import { Request, Response } from "express";
import {
  createCustomer,
  savePayment,
  createPayment,
  getToken,
  getPayment,
  generateProofPayment,
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

// Generate proof of payment (PDF)
export const generateProof = async (req: Request, res: Response) => {
  try {
    const { payment_id } = req.body;

    const searchPayment = await getPayment(payment_id);

    if (!searchPayment) {
      return res
        .status(404)
        .json({ message: "An error ocurred", error: "Payment not found" });
    }

    console.log("Payment found:", searchPayment);

    const pdf = await generateProofPayment(
      searchPayment.id,
      searchPayment.status,
      new Date(searchPayment.date_approved).toLocaleDateString(),
      searchPayment.transaction_amount,
      searchPayment.description,
      searchPayment.card?.cardholder?.name || "N/A",
      searchPayment.payer.email,
      searchPayment.payment_method.id,
      searchPayment.card?.last_four_digits || "N/A",
      searchPayment.authorization_code || "N/A"
    );

    if (!pdf) {
      return res
        .status(500)
        .json({ message: "An error ocurred", error: "Failed to generate PDF" });
    }

    res
      .status(200)
      .set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=proof_of_payment_${payment_id}.pdf`,
        "Content-Length": pdf.length,
      })
      .send(pdf);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error ocurred", error: err.message });
  }
};
