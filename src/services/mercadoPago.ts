import { Preference, MercadoPagoConfig, Payment } from "mercadopago";
import {
  historyPaymentModel,
  MatchPlayerModel,
  paymentMethod,
  proofPaymentData,
} from "../types/Payment";
import {
  getReservationWithIdQuery,
  updateReservationStatusQuery,
} from "../db/ReservationQueries";
import { getOnlyDate } from "./DateService";
import puppeteer from "puppeteer";
import { emitPayment } from "./webSocket";
import {
  getMatchByReservationQuery,
  updatePaymentMethod,
  updateStatusMatchQuery,
} from "../db/MatchQueries";
import { createPaymentHistoryQuery } from "../db/PaymentQueries";
import crypto from "crypto";

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || "",
});

const preference = new Preference(client);
const paymentClient = new Payment(client);

// Create payment
export const createPayment = async (
  reservation_id: string,
  account_id: string
) => {
  try {
    const reservation = await getReservationWithIdQuery(reservation_id);

    if (reservation.rows.length === 0) {
      throw new Error("Reservation not found");
    }

    // Format reservation date
    const reservationDate = getOnlyDate(reservation.rows[0].reservation_date);

    // Create payment
    const paymentRequest = await preference.create({
      body: {
        items: [
          {
            id: reservation.rows[0].id!,
            title: `Reservation(${reservationDate}) - ${reservation.rows[0].start_time} to ${reservation.rows[0].end_time}`,
            quantity: 1,
            unit_price: Number(reservation.rows[0].price),
            currency_id: "UYU",
          },
        ],

        back_urls: {
          success: `${process.env.MP_SUCCESS_URL}/successPayment.html`,
          failure: `${process.env.MP_SUCCESS_URL}/failurePayment.html`,
          pending: `${process.env.MP_SUCCESS_URL}/pendingPayment.html`,
        },

        auto_return: "approved",
        notification_url: process.env.MERCADO_PAGO_NOTIFICATION_URL,

        metadata: { reservation_id, account_id },
      },
    });

    return paymentRequest;
  } catch (error) {
    const err = error as Error;
    throw new Error(err.message);
  }
};

// Notification of payment
export const processMercadoPagoWebhook = async (
  type: string,
  data: { id: string }
) => {
  try {
    if (type !== "payment") return;

    const paymentId = data.id;

    const payment = await paymentClient.get({ id: paymentId });

    if (payment.status !== "approved") return;

    const reservation_id = payment.metadata?.reservation_id;

    if (!reservation_id) {
      throw new Error("reservation_id not found in metadata");
    }

    // Get reservation data
    const reservation = await getReservationWithIdQuery(reservation_id);

    if (reservation.rows.length === 0) {
      throw new Error("Reservation not found");
    }

    const account_id = reservation.rows[0].account_id;
    const is_match = reservation.rows[0].is_match;
    let paymentMethod: paymentMethod =
      payment.payment_method_id == "account_money"
        ? "cash"
        : (payment.payment_method_id as paymentMethod);

    // Emit WebSocket event
    emitPayment(reservation_id, paymentId, "approved");

    if (is_match) {
      // Handle match payment
      const match = await getMatchByReservationQuery(reservation_id);

      if (match.rows.length === 0) {
        throw new Error("Match not found");
      }

      if (match.rows[0].status === "pending") {
        throw new Error(`Match is already pending`);
      }

      // Create payment history for match
      await createPaymentHistoryQuery({
        account_id,
        reservation_id,
        total_amount: reservation.rows[0].price,
        payment_method: paymentMethod,
        payment_status: "completed",
        payment_date: new Date().toISOString(),
        paid_by: match.rows[0].creator_id,
        mp_payment_id: paymentId,
      });

      // Update payment method for the creator in MatchPlayer
      const data: MatchPlayerModel = {
        match_id: match.rows[0].id!,
        player_id: match.rows[0].creator_id!,
        payment_method: paymentMethod,
        payment_status: "completed",
      };

      await updatePaymentMethod(data);

      // Update match status to completed
      await updateStatusMatchQuery(match.rows[0].id!, "completed");
    } else {
      // Handle normal reservation payment
      await createPaymentHistoryQuery({
        account_id,
        reservation_id,
        total_amount: reservation.rows[0].price,
        payment_method: paymentMethod,
        payment_status: "completed",
        payment_date: new Date().toISOString(),
        paid_by: account_id,
        mp_payment_id: paymentId,
      });

      // Update reservation status to confirmed
      await updateReservationStatusQuery(reservation_id, "confirmed");
    }
  } catch (error) {
    console.error("Error processing MercadoPago webhook:", error);
    throw error;
  }
};

// Get payment
export const getPayment = async (payment_id: number) => {
  try {
    if (!payment_id) {
      throw new Error("Payment id is required");
    }

    const paymentRequest = await paymentClient.get({ id: payment_id });

    if (!paymentRequest) {
      throw new Error("Payment not found");
    }

    const response: proofPaymentData = {
      mp_payment_id: payment_id,
      status: paymentRequest.status!,
      date: new Date(paymentRequest.date_approved!).toLocaleDateString(),
      amount: paymentRequest.transaction_amount!,
      description: paymentRequest.description!,
      cardholder_name: paymentRequest.card?.cardholder?.name!,
      email: paymentRequest.payer?.email!,
      payment_method: paymentRequest.payment_method?.id!,
      last_four_digits: paymentRequest.card?.last_four_digits!,
      authorization_code: paymentRequest.authorization_code!,
    };

    return response;
  } catch (error) {
    const err = error as Error;
    throw new Error(err.message);
  }
};

// Generate proof of payment (HTML to PDF)
export const generateProofPayment = async (
  data: historyPaymentModel
): Promise<Buffer> => {
  try {
    let paymentSpecificRows = "";

    const row = (label: string, value?: string | number | null): string => {
      if (value === undefined || value === null || value === "") return "";
      return `<tr><th>${label}</th><td>${value}</td></tr>`;
    };

    const reservation = await getReservationWithIdQuery(data.reservation_id);

    if (reservation.rows.length === 0) {
      throw new Error("Reservation not found");
    }

    if (data.payment_method === "visa" || data.payment_method === "master") {
      const paymentMp = await getPayment(Number(data.mp_payment_id!));

      if (!paymentMp) {
        throw new Error("MercadoPago payment data not found");
      }

      paymentSpecificRows = `
        ${row("Payment Method", data.payment_method.toUpperCase())}
        ${row("MercadoPago ID", data.mp_payment_id)}
        ${row("Cardholder", paymentMp.cardholder_name)}
        ${row("Email", paymentMp.email)}
        ${row("Amount", `${paymentMp.amount} UYU`)}
        ${row("Description", paymentMp.description)}
        ${row("Payment Date", paymentMp.date)}
        ${row("Card Number", `**** ${paymentMp.last_four_digits}`)}
        ${row("Authorization Code", paymentMp.authorization_code)}
      `;
    } else {
      const paymentDate = getOnlyDate(data.payment_date);
      const reservationDate = getOnlyDate(reservation.rows[0].reservation_date);

      paymentSpecificRows = `
        ${row(
          "Payment Method",
          `${data.payment_method === "cash" ? "Cash" : "Bank Transfer"}`
        )}
        ${row(
          "Description",
          `Reservation(${reservationDate}) - ${reservation.rows[0].start_time} to ${reservation.rows[0].end_time}`
        )}
        ${row("Amount", `${data.total_amount} UYU`)}
        ${row("Payment Date", paymentDate)}
      `;
    }

    const proofHTML = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Proof of Payment - Lets Play</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 40px;
            background-color: #f9f9f9;
            color: #333;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #4CAF50;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #4CAF50;
          }
          .title {
            font-size: 20px;
            font-weight: bold;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 10px;
          }
          th {
            background-color: #4CAF50;
            color: white;
            text-align: left;
          }
          .footer {
            text-align: center;
            font-size: 12px;
            margin-top: 30px;
            color: #777;
          }
        </style>
      </head>
      <body>

        <div class="header">
          <div class="logo">Lets Play</div>
          <div class="title">Proof of Payment</div>
        </div>

        <table>
          ${paymentSpecificRows}
        </table>

        <div class="footer">
          This receipt certifies that the payment was successfully processed by <b>Lets Play</b>.
        </div>

      </body>
      </html>
    `;

    const response = await generatePDF(proofHTML);

    return Buffer.from(response);
  } catch (error) {
    console.error("Error generating proof of payment:", error);
    throw error;
  }
};

// Generate PDF from HTML using Puppeteer
export const generatePDF = async (html: string) => {
  try {
    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: true,
      timeout: 60000,
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();
    return pdfBuffer;
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
};

// Verify MercadoPago webhook signature
export const verifyMercadoPagoSignature = (
  signature: string,
  requestId: string,
  body: string,
  secret: string
): boolean => {
  const payload = `${requestId}.${body}`;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return signature.includes(expectedSignature);
};
