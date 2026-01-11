import e, { Request, Response } from "express";
import { createPayment } from "../services/mercadoPago";
import {
  confirmTransferBody,
  historyPaymentModel,
  PaymentCashBody,
  paymentDataBody,
  paymentResponse,
  PaymentDebitResponse,
  PaymentTransferBody,
  proofBodyModel,
  refundBody,
  MatchPlayerModel,
} from "../types/Payment";
import {
  getReservationWithIdQuery,
  updatePreReserveStatusQuery,
  updateReservationStatusQuery,
} from "../db/ReservationQueries";
import {
  getAccountByEmailQuery,
  getAccountByIdQuery,
} from "../db/AccountQueries";
import {
  getMatchByReservationQuery,
  getPlayerJoinedByMatchQuery,
  updatePaymentMethod,
} from "../db/MatchQueries";
import {
  createPaymentHistoryQuery,
  getPaymentByIdQuery,
  getPaymentByReservationAndAccount,
  getRefundByPaymentIdQuery,
  updatePaymentStatusQuery,
  updateStatusRefundQuery,
} from "../db/PaymentQueries";
import { getCurrentTime } from "../services/DateService";
import { errorResponseModel, successResponseModel } from "../types";
import { verifyCloudinaryFile } from "../services/cloudinary";
import {
  processMercadoPagoWebhook,
  generateProofPayment,
  verifyMercadoPagoSignature,
} from "../services/mercadoPago";
import { emitPayment } from "../services/webSocket";

// Generate debit payment
export const createDebitPayment = async (
  req: Request<{}, {}, paymentDataBody>,
  res: Response<errorResponseModel | PaymentDebitResponse>
) => {
  try {
    const { reservation_id, email } = req.body;

    const reservation = await getReservationWithIdQuery(reservation_id);
    const account = await getAccountByEmailQuery(email);

    if (reservation.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "An error ocurred", error: "Reservation not found" });
    }

    if (account.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "An error ocurred", error: "Account not found" });
    }

    const paid = await getPaymentByReservationAndAccount(
      reservation_id,
      account.rows[0]?.id!
    );

    if (paid.rows.length > 0) {
      return res.status(400).json({
        message: "An error ocurred",
        error: "The reservation has already been paid",
      });
    }

    if (
      reservation.rows[0].is_match &&
      reservation.rows[0].status !== "confirmed"
    ) {
      return res.status(400).json({
        message: "An error ocurred",
        error: "The match reservation must be confirmed before payment",
      });
    }

    const preference = await createPayment(
      reservation_id,
      account.rows[0]?.id!
    );

    return res.status(200).json({
      message: "Payment created successfully",
      data: { url: preference.id! },
    });
  } catch (error) {
    const err = error as Error;
    return res
      .status(400)
      .json({ error: "An error ocurred", message: err.message });
  }
};

// Notification webhook from MercadoPago
export const mercadoPagoWebhook = async (
  req: Request,
  res: Response<errorResponseModel | "OK">
) => {
  try {
    const signature = req.headers["x-signature"] as string;
    const requestId = req.headers["x-request-id"] as string;
    const rawBody = (req as any).rawBody;

    if (!signature || !requestId || !rawBody) {
      return res.status(401).json({
        error: "An error ocurred",
        message: "Missing signature headers",
      });
    }

    const isValid = verifyMercadoPagoSignature(
      signature,
      requestId,
      rawBody,
      process.env.MERCADO_PAGO_WEBHOOK_SECRET || ""
    );

    if (!isValid) {
      return res
        .status(401)
        .json({ error: "An error ocurred", message: "Invalid signature" });
    }

    const { type, data } = req.body;

    if (!type || !data?.id) {
      return res
        .status(400)
        .json({ error: "An error ocurred", message: "Invalid payload" });
    }

    await processMercadoPagoWebhook(type, data);
    res.status(200).send("OK");
  } catch (error) {
    const err = error as Error;
    res.status(400).json({ error: "An error ocurred", message: err.message });
  }
};

// Generate proof of Payment
export const generateProof = async (
  req: Request<{}, {}, proofBodyModel>,
  res: Response<Buffer | errorResponseModel>
) => {
  try {
    const { payment_id } = req.body;

    const payment = await getPaymentByIdQuery(payment_id);

    if (payment.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "An error ocurred", error: "Payment not found" });
    }

    const pdf = await generateProofPayment(payment.rows[0]);

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

// Bank transfer payment
export const createBankTransfer = async (
  req: Request<{}, {}, PaymentTransferBody>,
  res: Response<errorResponseModel | paymentResponse>
) => {
  try {
    const { reservation_id, account_id, proof_url } = req.body;

    const reservation = await getReservationWithIdQuery(reservation_id);
    const account = await getAccountByIdQuery(account_id);
    const today = getCurrentTime();

    if (reservation.rows.length === 0) {
      return res.status(404).json({
        message: "An error ocurred",
        error: "Reservation not found",
      });
    }

    if (account.rows.length === 0) {
      return res.status(404).json({
        message: "An error ocurred",
        error: "Account not found",
      });
    }

    // Check if there is already a pending or completed payment for this reservation
    const verifyPayment = await getPaymentByReservationAndAccount(
      reservation_id,
      account_id
    );

    if (verifyPayment.rows.length > 0) {
      const existingPayment = verifyPayment.rows.find(
        (payment) =>
          payment.payment_status === "pending" ||
          payment.payment_status === "completed"
      );

      if (existingPayment) {
        return res.status(400).json({
          message: "An error ocurred",
          error:
            "There is already a pending or completed payment for this reservation",
        });
      }
    }

    // Verify proof of payment URL
    const verifyProof = await verifyCloudinaryFile(proof_url);

    if (!verifyProof) {
      return res.status(404).json({
        message: "An error ocurred",
        error: "File not found",
      });
    }

    // Create payment history
    if (account.rows[0].id && reservation.rows[0].id) {
      let totalAmount = 0;

      // If reservation is a match
      if (reservation.rows[0].is_match) {
        const match = await getMatchByReservationQuery(reservation_id);

        if (match.rows.length === 0) {
          return res.status(404).json({
            message: "An error ocurred",
            error: "Match not found",
          });
        }

        if (match.rows[0].status !== "completed") {
          return res.status(400).json({
            message: "An error ocurred",
            error: `Match is already ${match.rows[0].status}`,
          });
        }

        totalAmount = match.rows[0].price_per_player;
      } else {
        // If reservation is not a match
        totalAmount = reservation.rows[0].price;
      }

      // Create History Payment
      const historyPaymentData: historyPaymentModel = {
        account_id: account.rows[0].id,
        reservation_id: reservation.rows[0].id,
        total_amount: totalAmount,
        payment_method: "bank_transfer",
        payment_status: "pending",
        payment_date: today,
        paid_by: account.rows[0].id,
        proof_of_payment: proof_url,
      };

      const payment = await createPaymentHistoryQuery(historyPaymentData);

      if (payment.rows.length === 0) {
        return res.status(500).json({
          message: "An error ocurred",
          error: "Failed to create payment history",
        });
      }

      emitPayment(
        payment.rows[0].reservation_id,
        payment.rows[0].id!,
        "pending"
      );

      return res.status(201).json({
        message: "Payment created successfully",
        data: payment.rows[0],
      });
    }
  } catch (error) {
    const err = error as Error;

    return res
      .status(400)
      .json({ error: "An error ocurred", message: err.message });
  }
};

// Confirm transfer payment
export const confirmTransferPayment = async (
  req: Request<{}, {}, confirmTransferBody>,
  res: Response<errorResponseModel | successResponseModel>
) => {
  try {
    const { payment_id, status } = req.body;
    const payment = await getPaymentByIdQuery(payment_id);

    if (payment.rows.length === 0) {
      return res.status(404).json({
        message: "An error ocurred",
        error: "Payment not found",
      });
    }

    const reservation = await getReservationWithIdQuery(
      payment.rows[0]?.reservation_id
    );

    if (reservation.rows.length === 0) {
      return res.status(404).json({
        message: "An error ocurred",
        error: "Reservation not found",
      });
    }

    // If payment is completed and reservation is a match, update match player payment method
    if (reservation.rows[0].is_match && reservation.rows[0].id) {
      const match = await getMatchByReservationQuery(reservation.rows[0].id);

      if (match.rows.length === 0) {
        return res.status(404).json({
          message: "An error ocurred",
          error: "Match not found",
        });
      }

      if (match.rows[0].id) {
        const data: MatchPlayerModel = {
          match_id: match.rows[0].id,
          player_id: payment.rows[0].paid_by,
          payment_method: "bank_transfer",
          payment_status: status,
        };

        await updatePaymentMethod(data);

        await updatePreReserveStatusQuery(reservation.rows[0].id, "completed");
      }
    } else {
      // If payment is completed and reservation is not a match, update reservation status
      if (reservation.rows[0].id) {
        await updateReservationStatusQuery(reservation.rows[0].id, "confirmed");
      }
    }

    // Update payment status
    await updatePaymentStatusQuery(payment_id, status);

    return res.status(201).json({
      message: "Payment confirmed successfully",
    });
  } catch (error) {
    const err = error as Error;
    return res
      .status(400)
      .json({ error: "An error ocurred", message: err.message });
  }
};

// Cash Payment
export const createCashPayment = async (
  req: Request<{}, {}, PaymentCashBody>,
  res: Response<errorResponseModel | successResponseModel>
) => {
  try {
    const { reservation_id, account_id } = req.body;
    const reservation = await getReservationWithIdQuery(reservation_id);
    const account = await getAccountByIdQuery(account_id);
    const today = getCurrentTime();

    if (reservation.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "An error ocurred", error: "Reservation not found" });
    }

    if (account.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "An error ocurred", error: "Account not found" });
    }

    // If reservation is a match
    if (reservation.rows[0].is_match) {
      const match = await getMatchByReservationQuery(reservation_id);

      if (match.rows.length === 0) {
        return res
          .status(404)
          .json({ message: "An error ocurred", error: "Match not found" });
      }

      if (match.rows[0].status !== "completed") {
        return res.status(400).json({
          message: "An error ocurred",
          error: `Match is already ${match.rows[0].status}`,
        });
      }

      if (account.rows[0].id && match.rows[0].id) {
        //Get player by match
        const player_match = await getPlayerJoinedByMatchQuery(
          account.rows[0].id,
          match.rows[0].id
        );
        const payment = await getPaymentByReservationAndAccount(
          reservation_id,
          account.rows[0].id
        );

        if (player_match.rows.length === 0) {
          return res.status(404).json({
            message: "An error ocurred",
            error: "Player not found in match",
          });
        }

        // Check if player already paid
        if (payment.rows.length > 0) {
          return res.status(400).json({
            message: "An error ocurred",
            error: "The player has already paid for this match",
          });
        }

        // Create History Payment
        const cashPayment = await createPaymentHistoryQuery({
          account_id: account.rows[0].id,
          reservation_id: reservation_id,
          total_amount: match.rows[0].price_per_player,
          payment_method: "cash",
          payment_status: "pending",
          payment_date: today,
          paid_by: account.rows[0].id,
        });

        // Update payment method in history

        const data: MatchPlayerModel = {
          match_id: match.rows[0].id,
          player_id: player_match.rows[0].player_id,
          payment_method: "cash",
          payment_status: "pending",
        };

        await updatePaymentMethod(data);

        emitPayment(reservation_id, cashPayment.rows[0]?.id!, "pending");

        return res.status(200).json({
          message: "Cash payment created successfully",
        });
      }
    }

    // If reservation is not a match
    if (account.rows[0].id) {
      const payment = await getPaymentByReservationAndAccount(
        reservation_id,
        account.rows[0].id
      );

      if (payment.rows.length > 0) {
        return res.status(400).json({
          message: "An error ocurred",
          error: "The reservation has already been paid",
        });
      }

      // Create History Payment
      await createPaymentHistoryQuery({
        account_id: account.rows[0].id,
        reservation_id: reservation_id,
        total_amount: reservation.rows[0].price,
        payment_method: "cash",
        payment_status: "pending",
        payment_date: today,
        paid_by: account.rows[0].id,
      });
      await updateReservationStatusQuery(reservation_id, "confirmed");

      emitPayment(reservation_id, payment.rows[0]?.id!, "pending");

      return res.status(200).json({
        message: "Cash payment created successfully",
      });
    }
  } catch (error) {
    const err = error as Error;
    return res
      .status(400)
      .json({ error: "An error ocurred", message: err.message });
  }
};

// Refund Payment (** ONLY TEST **)
export const refundPayment = async (
  req: Request<{}, {}, refundBody>,
  res: Response<errorResponseModel | successResponseModel>
) => {
  try {
    const { payment_id, proof_refund, refund_status, refunded_by } = req.body;

    const payment = await getPaymentByIdQuery(payment_id);

    if (payment.rows.length === 0) {
      return res.status(404).json({
        message: "An error ocurred",
        error: "Payment not found",
      });
    }

    const verifyPayment = await getRefundByPaymentIdQuery(payment_id);

    if (
      verifyPayment.rows.length > 0 &&
      verifyPayment.rows[0].refund_status !== "pending"
    ) {
      return res.status(400).json({
        message: "An error ocurred",
        error: "There is already a refund for this payment",
      });
    }

    // Verify proof of refund URL
    const verifyProof = await verifyCloudinaryFile(proof_refund!);

    if (!verifyProof) {
      return res.status(404).json({
        message: "An error ocurred",
        error: "File not found",
      });
    }

    // Create refund
    const refundData: refundBody = {
      payment_id,
      proof_refund,
      refunded_by,
      refund_status,
    };

    await updateStatusRefundQuery(refundData);

    return res.status(200).json({
      message: "Refund created successfully",
    });
  } catch (error) {
    const err = error as Error;
    return res
      .status(400)
      .json({ error: "Error creating refund", message: err.message });
  }
};
