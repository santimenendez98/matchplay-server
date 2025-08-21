import { Request, Response } from "express";
import { getCurrentTime } from "../services/addMinutes";
import { getAccountByIdQuery } from "../db/AccountQueries";
import {
  createPayment,
  getPaymentMethod,
  getToken,
} from "../services/mercadoPago";
import {
  getReservationWithIdQuery,
  savePaymentHistoryQuery,
  updateReservationStatusQuery,
} from "../db/ReservationQueries";
import {
  PaymentHistory,
  PaymentReservationBody,
  PaymentReservationResponse,
} from "../types/Payment";
import { errorResponseModel } from "../types";

export const paymentReservationWithCard = async (
  req: Request<{}, {}, PaymentReservationBody>,
  res: Response<PaymentReservationResponse | errorResponseModel>
) => {
  try {
    const { account_id, reservation_id, amount, payment_data } = req.body;

    const account = await getAccountByIdQuery(account_id);
    const reservation = await getReservationWithIdQuery(reservation_id);
    const customer_id = account.rows[0].id_customer;
    const today = getCurrentTime();
    const token = await getToken(payment_data);
    const payment_method = await getPaymentMethod(token.first_six_digits);

    if (!customer_id) {
      return res.status(404).json({
        message: "An error ocurred",
        error: "Customer not found",
      });
    }

    if (reservation.rows.length === 0) {
      return res.status(404).json({
        message: "An error ocurred",
        error: "Reservation not found",
      });
    }

    // Check if reservation status is pending
    if (reservation.rows[0].status !== "pending") {
      return res.status(400).json({
        message: "An error ocurred",
        error: `Reservation status is "${reservation.rows[0].status}", cannot proceed with payment`,
      });
    }

    //Data about payment
    const data = {
      id: customer_id.toString(),
      reservation_id,
      token: token.id,
      amount,
      description: `Reservation id ${reservation_id} for ${today}`,
      payment_method,
    };

    //Create Payment
    const response = await createPayment(data);
    console.log("Payment response:", response);

    if (response.status !== "approved") {
      return res.status(400).json({
        message: "An error ocurred",
        error: "Payment cannot completed",
      });
    }

    //Update status of reservation
    await updateReservationStatusQuery(reservation_id, "confirmed");

    //Save Payment on history
    const dataPayment: PaymentHistory = {
      user_id: account_id,
      reservation_id,
      amount,
      payment_method: "debit card",
      payment_status: "completed",
      payment_date: today,
      paid_by: account_id,
    };

    await savePaymentHistoryQuery(dataPayment);

    return res.status(200).json({
      message: "Payment created success",
      data: response,
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      message: "Error creating payment",
      error: err.message,
    });
  }
};
