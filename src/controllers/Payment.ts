import { Request, Response } from "express";
import {
  createPreference,
  generateProofPayment,
  getPayment,
  verifyWebhookSignature,
} from "../services/mercadoPago";
import {
  confirmTransferBody,
  CreatePreferenceBody,
  CreatePreferenceResponse,
  historyPaymentModel,
  MpWebhookBody,
  PaymentCashBody,
  paymentResponse,
  PaymentTransferBody,
  proofBodyModel,
  proofPaymentData,
  refundBody,
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
  getAllPaymentsQuery,
  getPaymentByIdQuery,
  getPaymentByReservationAndAccount,
  getPaymentByReservation,
  getPaymentsByAccountQuery,
  getRefundByPaymentIdQuery,
  updatePaymentAfterWebhookQuery,
  updatePaymentPreferenceQuery,
  updatePaymentStatusQuery,
  updateStatusRefundQuery,
} from "../db/PaymentQueries";
import { getCurrentTime, getOnlyDate } from "../services/addMinutes";
import { errorResponseModel, successResponseModel } from "../types";
import { buildSignedUpload, verifyCloudinaryFile } from "../services/cloudinary";
import { parsePagination } from "../services/pagination";
import { logger } from "../services/logger";

const mapMpStatus = (
  status?: string
): "pending" | "completed" | "failed" | "cancelled" => {
  switch (status) {
    case "approved":
      return "completed";
    case "in_process":
    case "pending":
    case "authorized":
      return "pending";
    case "rejected":
    case "cancelled":
    case "refunded":
    case "charged_back":
      return "failed";
    default:
      return "pending";
  }
};

// Create a MercadoPago Checkout Pro preference for a reservation.
// Frontend sends { reservation_id, email }; backend resolves the amount,
// inserts a pending Payment row, creates the MP preference and returns the
// init_point so the user can be redirected to MercadoPago.
export const createCheckoutPreference = async (
  req: Request<{}, {}, CreatePreferenceBody>,
  res: Response<CreatePreferenceResponse | errorResponseModel>
) => {
  let pendingPaymentId: string | undefined;
  try {
    const { reservation_id, email } = req.body;
    const reservation = await getReservationWithIdQuery(reservation_id);
    const account = await getAccountByEmailQuery(email);
    const today = getCurrentTime();

    if (reservation.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "An error ocurred", error: "Reservation not found" });
    }

    if (account.rows.length === 0 || !account.rows[0].id) {
      return res
        .status(404)
        .json({ message: "An error ocurred", error: "Account not found" });
    }

    let totalAmount = 0;
    let description = "";
    let matchPlayerInfo: { match_id: string; player_id: string } | null = null;

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

      const player_match = await getPlayerJoinedByMatchQuery(
        account.rows[0].id,
        match.rows[0].id!
      );

      if (player_match.rows.length === 0) {
        return res.status(400).json({
          message: "An error ocurred",
          error: "No found this player on match",
        });
      }

      const existing = await getPaymentByReservationAndAccount(
        reservation_id,
        account.rows[0].id
      );

      const blocking = existing.rows.find(
        (p) =>
          p.payment_status === "pending" || p.payment_status === "completed"
      );

      if (
        blocking &&
        player_match.rows[0].payment_method !== "cash"
      ) {
        return res.status(400).json({
          message: "An error ocurred",
          error: "The player has already paid for this match",
        });
      }

      totalAmount = match.rows[0].price_per_player;
      description = `Match #${match.rows[0].id} - ${getOnlyDate(
        reservation.rows[0].reservation_date
      )} ${reservation.rows[0].start_time}-${reservation.rows[0].end_time}`;
      matchPlayerInfo = {
        match_id: String(player_match.rows[0].match_id),
        player_id: String(player_match.rows[0].player_id),
      };
    } else {
      if (reservation.rows[0].status !== "pending") {
        return res.status(400).json({
          message: "An error ocurred",
          error: `Reservation is already ${reservation.rows[0].status}`,
        });
      }

      const existing = await getPaymentByReservationAndAccount(
        reservation_id,
        account.rows[0].id
      );

      const blocking = existing.rows.find(
        (p) =>
          p.payment_status === "pending" || p.payment_status === "completed"
      );

      if (blocking) {
        return res.status(400).json({
          message: "An error ocurred",
          error: "The reservation has already been paid",
        });
      }

      totalAmount = reservation.rows[0].price;
      description = `Reservation #${reservation_id} - ${getOnlyDate(
        reservation.rows[0].reservation_date
      )} ${reservation.rows[0].start_time}-${reservation.rows[0].end_time}`;
    }

    const inserted = await createPaymentHistoryQuery({
      account_id: account.rows[0].id,
      reservation_id: reservation_id,
      total_amount: totalAmount,
      payment_method: "debit_card",
      payment_status: "pending",
      payment_date: today,
      paid_by: account.rows[0].id,
      mp_payment_id: null,
    });

    pendingPaymentId = String(inserted.rows[0]?.id);

    if (!pendingPaymentId) {
      return res.status(500).json({
        message: "An error ocurred",
        error: "Failed to create payment record",
      });
    }

    const pref = await createPreference({
      reservation_id,
      amount: totalAmount,
      description,
      payer_email: email,
      external_reference: pendingPaymentId,
    });

    if (!pref?.id || !pref?.init_point) {
      await updatePaymentStatusQuery(pendingPaymentId, "failed");
      return res.status(502).json({
        message: "An error ocurred",
        error: "MercadoPago preference creation failed",
      });
    }

    await updatePaymentPreferenceQuery(pendingPaymentId, pref.id);

    // Persist matchPlayerInfo on the response for the frontend if needed.
    void matchPlayerInfo;

    return res.status(200).json({
      message: "Checkout preference created",
      init_point: pref.init_point,
      preference_id: pref.id,
      payment_id: pendingPaymentId,
    });
  } catch (error) {
    const err = error as Error;
    if (pendingPaymentId) {
      try {
        await updatePaymentStatusQuery(pendingPaymentId, "failed");
      } catch (cleanupErr) {
        logger.warn(
          { err: cleanupErr, payment_id: pendingPaymentId },
          "failed to mark pending payment as failed after preference error"
        );
      }
    }
    logger.error({ err }, "createCheckoutPreference failed");
    return res.status(400).json({
      message: "Error creating preference",
      error: err.message,
    });
  }
};

// MercadoPago webhook handler — public, signature-verified. MP retries on
// non-2xx, so every branch must be idempotent and respond 200 unless the
// signature itself is invalid.
export const mercadoPagoWebhook = async (
  req: Request<{}, {}, MpWebhookBody>,
  res: Response
) => {
  try {
    const xSignature = req.header("x-signature");
    const xRequestId = req.header("x-request-id");
    const dataId =
      req.body?.data?.id ??
      (typeof req.query["data.id"] === "string"
        ? (req.query["data.id"] as string)
        : typeof req.query.id === "string"
        ? (req.query.id as string)
        : undefined);

    if (!verifyWebhookSignature(xSignature, xRequestId, String(dataId))) {
      logger.warn({ xRequestId }, "rejecting webhook: invalid signature");
      return res.status(401).json({ error: "Invalid signature" });
    }

    const eventType = req.body?.type || req.body?.action;
    if (!eventType || !String(eventType).includes("payment")) {
      return res.status(200).json({ received: true });
    }

    if (!dataId) return res.status(200).json({ received: true });

    const mpPayment: any = await getPayment(Number(dataId));
    const externalRef: string | undefined = mpPayment?.external_reference
      ? String(mpPayment.external_reference)
      : undefined;

    if (!externalRef) return res.status(200).json({ received: true });

    const local = await getPaymentByIdQuery(externalRef);
    if (local.rows.length === 0)
      return res.status(200).json({ received: true });

    const localRow = local.rows[0];
    const incomingMpId = String(mpPayment.id);

    if (
      localRow.payment_status === "completed" &&
      localRow.mp_payment_id === incomingMpId
    ) {
      return res.status(200).json({ received: true });
    }

    const mappedStatus = mapMpStatus(mpPayment.status);

    await updatePaymentAfterWebhookQuery({
      payment_id: externalRef,
      mp_payment_id: incomingMpId,
      payment_status: mappedStatus,
      mp_status: mpPayment.status || "",
      mp_status_detail: mpPayment.status_detail || "",
    });

    if (mappedStatus === "completed") {
      const reservation = await getReservationWithIdQuery(
        localRow.reservation_id
      );
      if (reservation.rows.length > 0) {
        if (reservation.rows[0].is_match) {
          const match = await getMatchByReservationQuery(
            localRow.reservation_id
          );
          if (match.rows.length > 0 && match.rows[0].id) {
            await updatePaymentMethod(
              match.rows[0].id,
              localRow.paid_by,
              "debit_card"
            );
          }
        } else {
          await updateReservationStatusQuery(
            localRow.reservation_id,
            "confirmed"
          );
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    const err = error as Error;
    logger.error({ err }, "mercadoPagoWebhook failed");
    // Still 200 so MP doesn't retry on internal errors we can't recover from.
    return res.status(200).json({ received: true });
  }
};

// Generate proof of Payment
export const generateProof = async (
  req: Request<{}, {}, proofBodyModel>,
  res: Response<Buffer | errorResponseModel>
) => {
  try {
    const { mp_payment_id } = req.body;

    // Ownership: a non-admin user can only request a PDF for a payment they
    // paid for.
    const isAdmin =
      req.user?.rol === "admin" || req.user?.rol === "creator";
    if (!isAdmin) {
      // Look up the local Payment record by mp_payment_id to verify ownership.
      const local = await getPaymentByIdQuery(String(mp_payment_id));
      const matching = local.rows.find(
        (p: any) => p.mp_payment_id === String(mp_payment_id)
      );
      if (matching && matching.paid_by && matching.paid_by !== req.user?.id) {
        return res
          .status(403)
          .json({ message: "An error ocurred", error: "Forbidden" });
      }
    }

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

      return res.status(201).json({
        message: "Payment created successfully",
        data: payment.rows[0],
      });
    }
  } catch (error) {
    const err = error as Error;

    return res
      .status(400)
      .json({ error: "Error creating payment", message: err.message });
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
        await updatePaymentMethod(
          match.rows[0].id,
          payment.rows[0].paid_by,
          "bank_transfer"
        );

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
      message: "Payment updated success",
    });
  } catch (error) {
    const err = error as Error;
    return res
      .status(400)
      .json({ error: "Error creating confirmation", message: err.message });
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
          return res.status(400).json({
            message: "An error ocurred",
            error: "No found this player on match",
          });
        }

        // Check if player already paid
        if (
          player_match.rows[0].payment_method !== "cash" ||
          payment.rows.length > 0
        ) {
          return res.status(400).json({
            message: "An error ocurred",
            error: "The player has already paid for this match",
          });
        }

        // Create History Payment
        await createPaymentHistoryQuery({
          account_id: account.rows[0].id,
          reservation_id: reservation_id,
          total_amount: match.rows[0].price_per_player,
          payment_method: "cash",
          payment_status: "completed",
          payment_date: today,
          paid_by: account.rows[0].id,
        });

        // Update payment method in history
        await updatePaymentMethod(
          player_match.rows[0].match_id,
          player_match.rows[0].player_id,
          "cash"
        );

        return res.status(200).json({
          message: "Payment for match confirmed",
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
        payment_status: "completed",
        payment_date: today,
        paid_by: account.rows[0].id,
      });
      await updateReservationStatusQuery(reservation_id, "confirmed");

      return res.status(200).json({
        message: "Payment for reservation confirmed",
      });
    }
  } catch (error) {
    const err = error as Error;
    return res
      .status(400)
      .json({ error: "Error creating payment", message: err.message });
  }
};

// Get all payments (admin/creator)
export const getPayments = async (req: Request, res: Response) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const result = await getAllPaymentsQuery(limit, offset);
    res.status(200).json({ message: "Payment List", data: result.rows });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

// Get payment by id (admin/creator)
export const getPaymentById = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const { id } = req.params;
    const result = await getPaymentByIdQuery(id);
    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "An error ocurred", error: "Payment not found" });
    }
    res
      .status(200)
      .json({ message: "Payment found", data: result.rows[0] });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

// Get payments for an account (or "me" for the authenticated user)
export const getPaymentsByAccount = async (
  req: Request<{ accountId: string }>,
  res: Response
) => {
  try {
    const { accountId } = req.params;
    const targetId = accountId === "me" ? req.user?.id : accountId;
    if (!targetId) {
      return res.status(400).json({
        message: "An error ocurred",
        error: "Missing account id",
      });
    }
    if (
      accountId !== "me" &&
      req.user?.id !== String(targetId) &&
      req.user?.rol !== "admin" &&
      req.user?.rol !== "creator"
    ) {
      return res.status(403).json({
        message: "An error ocurred",
        error: "Forbidden",
      });
    }
    const { limit, offset } = parsePagination(req.query);
    const result = await getPaymentsByAccountQuery(
      String(targetId),
      limit,
      offset
    );
    res.status(200).json({ message: "Payment List", data: result.rows });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

// Build a signed upload payload so the frontend can upload directly to Cloudinary.
export const signCloudinaryUpload = (
  req: Request<{}, {}, {}, { folder?: string; public_id?: string }>,
  res: Response
) => {
  try {
    const folder = req.query.folder || "matchplay";
    const payload = buildSignedUpload(folder, req.query.public_id);
    res.status(200).json({ message: "Signed upload", data: payload });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

// Get all payments for a reservation (admins)
export const getPaymentsByReservation = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const { id } = req.params;
    const result = await getPaymentByReservation(id);
    res
      .status(200)
      .json({ message: "Payment List", data: result.rows });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

// Refund Payment
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
