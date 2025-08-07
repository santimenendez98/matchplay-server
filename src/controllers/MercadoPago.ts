import { Request, Response } from "express";
import { payment } from "../services/mercadoPago";
import { updateReservationStatusQuery } from "../db/ReservationQueries";
import { emitPaymentStatus } from "../services/webSocket";

export const mercadoPagoWebhook = async (req: Request, res: Response) => {
  try {
    const { id } = req.body.data;

    console.log("Webhook received for payment ID:", id);

    const verifyPayment = await payment.get(id);

    if (verifyPayment.status !== "approved") {
      await updateReservationStatusQuery(
        verifyPayment.external_reference!,
        "cancelled"
      );

      emitPaymentStatus(verifyPayment.id!, verifyPayment.external_reference!);

      return res.status(400).json({
        message: "Payment not approved",
        data: verifyPayment,
      });
    }

    await updateReservationStatusQuery(
      verifyPayment.external_reference!,
      "confirmed"
    );

    emitPaymentStatus(verifyPayment.id!, verifyPayment.external_reference!);

    res.status(200).json({
      message: "Payment processed successfully",
      data: verifyPayment,
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      message: "Error processing webhook",
      error: err.message,
    });
  }
};
