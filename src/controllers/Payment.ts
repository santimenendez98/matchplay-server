import { Request, Response } from "express";
import { getCurrentTime } from "../services/addMinutes";
import { getAccountByIdQuery } from "../db/AccountQueries";
import {
  getToken,
  handleMatchPayment,
  processDebitPayment,
} from "../services/mercadoPago";
import {
  getReservationWithIdQuery,
  updateReservationStatusQuery,
} from "../db/ReservationQueries";
import {
  PaymentReservationBody,
  PaymentReservationResponse,
} from "../types/Payment";
import { errorResponseModel } from "../types";
import {
  getMatchByReservationQuery,
  updatePaymentMethod,
} from "../db/MatchQueries";

//Validate Reservation and status
export const validateReservation = (reservation: any) => {
  if (reservation.rows.length === 0) {
    throw new Error("RESERVATION_NOT_FOUND");
  }

  if (
    reservation.rows[0].is_match &&
    reservation.rows[0].status !== "confirmed"
  ) {
    throw new Error(
      `RESERVATION_STATUS_${reservation.rows[0].status.toUpperCase()}`
    );
  }

  if (
    !reservation.rows[0].is_match &&
    reservation.rows[0].status !== "pending"
  ) {
    throw new Error(
      `RESERVATION_STATUS_${reservation.rows[0].status.toUpperCase()}`
    );
  }
};

// Controller to handle payment for a reservation with card details
export const paymentReservationWithCard = async (
  req: Request<{}, {}, PaymentReservationBody>,
  res: Response<PaymentReservationResponse | errorResponseModel>
) => {
  try {
    const { account_id, reservation_id, payment_data, paid_by } = req.body;

    const account = await getAccountByIdQuery(account_id);
    const reservation = await getReservationWithIdQuery(reservation_id);
    const today = getCurrentTime();

    if (account.rows.length === 0) {
      return res.status(404).json({
        message: "Account not found",
        error: "ACCOUNT_NOT_FOUND",
      });
    }

    if (reservation.rows.length === 0) {
      return res.status(404).json({
        message: "Reservation not found",
        error: "RESERVATION_NOT_FOUND",
      });
    }

    const customer_id = account.rows[0].id_customer;

    if (!customer_id) {
      return res.status(404).json({
        message: "Customer not found in MercadoPago",
        error: "CUSTOMER_ID_MISSING",
      });
    }

    if (paid_by) {
      const accountPaidBy = await getAccountByIdQuery(paid_by);
      if (accountPaidBy.rows.length === 0) {
        return res.status(404).json({
          message: "Account who paid not found",
          error: "PAID_BY_NOT_FOUND",
        });
      }
    }

    validateReservation(reservation);

    // Get token from card details
    const token = await getToken(payment_data);

    let paymentResponse;

    if (reservation.rows[0].is_match) {
      const match = await getMatchByReservationQuery(reservation_id);

      if (match.rows.length === 0) {
        return res.status(404).json({
          message: "Match not found for this reservation",
          error: "MATCH_NOT_FOUND",
        });
      }

      const match_id = match.rows[0].id;

      if (!match_id) {
        return res.status(400).json({
          message: "Reservation is not a match reservation",
          error: "RESERVATION_NOT_A_MATCH",
        });
      }

      paymentResponse = await handleMatchPayment(
        reservation_id,
        account_id,
        customer_id,
        token,
        today,
        paid_by
      );

      // Update payment method in MatchPlayer
      await updatePaymentMethod(match_id, account_id);
    } else {
      // Process payment for regular reservation
      paymentResponse = await processDebitPayment(
        customer_id,
        token,
        reservation.rows[0].price,
        reservation_id,
        reservation.rows[0].reservation_date,
        reservation.rows[0].start_time,
        reservation.rows[0].end_time,
        today,
        account_id
      );

      // Update reservation status to confirmed
      await updateReservationStatusQuery(reservation_id, "confirmed");
    }

    return res.status(200).json({
      message: "Payment created successfully",
      data: paymentResponse,
    });
  } catch (error) {
    const err = error as Error;

    // Map errors to HTTP status codes and clear messages
    const errorMap: Record<string, { status: number; message: string }> = {
      ACCOUNT_NOT_FOUND: { status: 404, message: "Account not found" },
      CUSTOMER_ID_MISSING: {
        status: 404,
        message: "Customer ID missing in MP",
      },
      PAID_BY_NOT_FOUND: { status: 404, message: "Paid by account not found" },
      RESERVATION_NOT_FOUND: { status: 404, message: "Reservation not found" },
      RESERVATION_STATUS_CONFIRMED: {
        status: 400,
        message: "Reservation already confirmed",
      },
      RESERVATION_STATUS_PENDING: {
        status: 400,
        message: "Reservation still pending",
      },
      RESERVATION_STATUS_CANCELLED: {
        status: 400,
        message: "Reservation cancelled",
      },
      MATCH_NOT_FOUND: {
        status: 404,
        message: "Match not found for this reservation",
      },
      MATCH_STATUS_PENDING: {
        status: 400,
        message: "Match still pending, cannot pay",
      },
      MATCH_STATUS_CANCELLED: {
        status: 400,
        message: "Match cancelled, cannot pay",
      },
      USER_ALREADY_PAID: {
        status: 400,
        message: "User already paid for this reservation",
      },
      PAYMENT_NOT_APPROVED: { status: 400, message: "Payment not approved" },
      ONLY_DEBIT_ALLOWED: {
        status: 400,
        message: "Only debit cards are allowed",
      },
    };

    const mappedError = errorMap[err.message];

    if (mappedError) {
      return res.status(mappedError.status).json({
        message: mappedError.message,
        error: err.message,
      });
    }

    return res.status(500).json({
      message: "Unexpected error creating payment",
      error: err.message,
    });
  }
};
