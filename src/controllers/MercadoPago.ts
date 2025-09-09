import { Request, Response } from "express";
import {
  createPayment,
  generateProofPayment,
  getPayment,
} from "../services/mercadoPago";
import {
  paymentDataBody,
  proofBodyModel,
  proofPaymentData,
} from "../types/Payment";
import {
  getReservationWithIdQuery,
  updateReservationStatusQuery,
} from "../db/ReservationQueries";
import { getAccountByEmailQuery } from "../db/AccountQueries";
import {
  getMatchByReservationQuery,
  getPlayerJoinedByMatchQuery,
  updatePaymentMethod,
} from "../db/MatchQueries";
import { createPaymentHistoryQuery } from "../db/PaymentQueries";
import { getCurrentTime } from "../services/addMinutes";
import { errorResponseModel } from "../types";

// Generate debit payment
export const createDebitPayment = async (
  req: Request<{}, {}, paymentDataBody>,
  res: Response
) => {
  try {
    const { reservation_id, email } = req.body;
    const reservation = await getReservationWithIdQuery(reservation_id);
    const account = await getAccountByEmailQuery(email);
    const today = getCurrentTime();

    // Check if reservation exists
    if (reservation.rows.length === 0) {
      return res.status(404).json({ error: "Reservation not found" });
    }

    if (account.rows.length === 0) {
      return res.status(404).json({
        error: "Account not found",
      });
    }

    // If reservation is a match
    if (reservation.rows[0].is_match) {
      const match = await getMatchByReservationQuery(reservation_id);

      if (match.rows.length === 0) {
        return res.status(404).json({ error: "Match not found" });
      }

      if (match.rows[0].id && account.rows[0].id) {
        //Get player by match
        const player_match = await getPlayerJoinedByMatchQuery(
          account.rows[0].id,
          match.rows[0].id
        );

        // Check if match is already confirmed
        if (match.rows[0].status !== "completed") {
          return res.status(400).json({
            error: `Match is already ${match.rows[0].status}`,
          });
        }

        if (player_match.rows.length === 0) {
          return res
            .status(400)
            .json({ error: "No found this player on match" });
        }

        // Check if player already paid
        if (player_match.rows[0].payment_method === "debit_card") {
          return res.status(400).json({
            error: "The player has already paid for this match",
          });
        }

        // Create Payment
        const paymentRequest = await createPayment(req.body);

        if (!paymentRequest) {
          return res.status(400).json({ error: "Payment creation failed" });
        }

        if (paymentRequest.id) {
          // Update payment method in history
          await updatePaymentMethod(
            player_match.rows[0].match_id,
            player_match.rows[0].player_id,
            "debit_card"
          );

          // Create History Payment

          console.log(paymentRequest);

          await createPaymentHistoryQuery({
            account_id: account.rows[0].id,
            reservation_id: reservation_id,
            total_amount: match.rows[0].price_per_player,
            payment_method: "debit_card",
            payment_status: "completed",
            payment_date: today,
            paid_by: account.rows[0].id,
            mp_payment_id: paymentRequest.id.toString(),
          });

          return res.status(200).json({
            message: "Payment for match confirmed",
            payment: paymentRequest,
          });
        }
      }
    }

    // Check if reservation is already confirmed
    if (reservation.rows[0].status !== "pending") {
      return res.status(400).json({
        error: `Reservation is already ${reservation.rows[0].status}`,
      });
    }

    const paymentRequest = await createPayment(req.body);

    // Check if payment was created successfully
    if (!paymentRequest) {
      return res.status(400).json({ error: "Payment creation failed" });
    }

    if (paymentRequest.id && account.rows[0].id) {
      await createPaymentHistoryQuery({
        account_id: account.rows[0].id,
        reservation_id: reservation_id,
        total_amount: reservation.rows[0].price,
        payment_method: "debit_card",
        payment_status: "completed",
        payment_date: today,
        paid_by: account.rows[0].id,
        mp_payment_id: paymentRequest.id.toString(),
      });

      await updateReservationStatusQuery(reservation_id, "confirmed");

      return res.status(200).json({
        message: "Payment for reservation confirmed",
        payment: paymentRequest,
      });
    }
  } catch (error) {
    const err = error as Error;
    return res
      .status(400)
      .json({ error: "Error creating payment", message: err.message });
  }
};

// Generate proof of Payment
export const generateProof = async (
  req: Request<{}, {}, proofBodyModel>,
  res: Response<Buffer | errorResponseModel>
) => {
  try {
    const { mp_payment_id } = req.body;

    const searchPayment = await getPayment(mp_payment_id);

    if (!searchPayment) {
      return res
        .status(404)
        .json({ message: "An error ocurred", error: "Payment not found" });
    }

    const data: proofPaymentData = {
      mp_payment_id: searchPayment.id!,
      status: searchPayment.status!,
      date: new Date(searchPayment.date_approved!).toLocaleDateString(),
      amount: searchPayment.transaction_amount!,
      description: searchPayment.description!,
      cardholder_name: searchPayment.card?.cardholder?.name || "N/A",
      email: searchPayment.payer?.email!,
      payment_method: searchPayment.payment_method?.id!,
      last_four_digits: searchPayment.card?.last_four_digits || "N/A",
      autorization_code: searchPayment.authorization_code!,
    };

    const pdf = await generateProofPayment(data);

    if (!pdf) {
      return res
        .status(500)
        .json({ message: "An error ocurred", error: "Failed to generate PDF" });
    }

    res
      .status(200)
      .set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=proof_of_payment_${mp_payment_id}.pdf`,
        "Content-Length": pdf.length,
      })
      .send(pdf);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error ocurred", error: err.message });
  }
};
