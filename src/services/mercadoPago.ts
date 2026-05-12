import { Payment, Preference, MercadoPagoConfig } from "mercadopago";
import crypto from "crypto";
import puppeteer from "puppeteer";
import {
  CreatePreferenceInput,
  proofPaymentData,
} from "../types/Payment";

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || "",
});

const payment = new Payment(client);
const preference = new Preference(client);

export const createPreference = async (input: CreatePreferenceInput) => {
  const FRONTEND = process.env.FRONTEND_URL || "http://localhost:5173";
  const API = process.env.API_BASE_URL || "http://localhost:3000";

  const result = await preference.create({
    body: {
      items: [
        {
          id: input.reservation_id,
          title: input.description,
          quantity: 1,
          currency_id: "UYU",
          unit_price: input.amount,
        },
      ],
      payer: { email: input.payer_email },
      external_reference: input.external_reference,
      notification_url: `${API}/api/payment/webhook`,
      back_urls: {
        success: `${FRONTEND}/payment/success?reservation_id=${input.reservation_id}`,
        failure: `${FRONTEND}/payment/failure?reservation_id=${input.reservation_id}`,
        pending: `${FRONTEND}/payment/pending?reservation_id=${input.reservation_id}`,
      },
      auto_return:
        process.env.NODE_ENV === "production" ? "approved" : undefined,
      binary_mode: false,
    },
    requestOptions: {
      idempotencyKey: `pref-reservation-${input.reservation_id}-${Date.now()}`,
    },
  });

  return result;
};

export const verifyWebhookSignature = (
  xSignature: string | undefined,
  xRequestId: string | undefined,
  dataId: string | undefined
): boolean => {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!secret || !xSignature || !xRequestId || !dataId) return false;

  const parts = Object.fromEntries(
    xSignature
      .split(",")
      .map((s) => s.trim().split("=").map((t) => t.trim()))
      .filter((p) => p.length === 2)
  );

  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const hmac = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(v1));
  } catch {
    return false;
  }
};

// Get payment
export const getPayment = async (payment_id: number) => {
  try {
    if (!payment_id) {
      throw new Error("Payment id is required");
    }

    const paymentRequest = payment.get({ id: payment_id });

    return paymentRequest;
  } catch (error) {
    const err = error as Error;
    throw new Error(err.message);
  }
};

// Generate proof of payment (HTML to PDF)
export const generateProofPayment = async (
  data: proofPaymentData
): Promise<Buffer> => {
  try {
    const proofHTML = `
     <!DOCTYPE html>
  <html lang="es">
  <head>
      <meta charset="UTF-8">
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
          .qr {
              text-align: center;
              margin-top: 50px;
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
          <tr><th>Payment ID</th><td>${data.mp_payment_id}</td></tr>
          <tr><th>Status</th><td>${data.status}</td></tr>
          <tr><th>Approval Date</th><td>${data.date}</td></tr>
          <tr><th>Amount</th><td>${data.amount} UYU</td></tr>
          <tr><th>Description</th><td>${data.description}</td></tr>
          <tr><th>Cardholder Name</th><td>${data.cardholder_name}</td></tr>
          <tr><th>Email</th><td>${data.email}</td></tr>
          <tr><th>Payment Method</th><td>Debit ${data.payment_method
            .slice(3)
            .toUpperCase()}</td></tr>
          <tr><th>Card Number</th><td>**** ${data.last_four_digits}</td></tr>
          <tr><th>Authorization Code</th><td>${data.autorization_code}</td></tr>
      </table>

      <div class="qr">
          <img src="https://api.qrserver.com/v1/create-qr-code/?data=${
            data.mp_payment_id
          }&size=120x120" alt="QR Code" width="120">
      </div>

      <div class="footer">
          This proof is valid as a payment receipt at <b>Lets Play</b>. Thank you for trusting us.
      </div>
  </body>
</html>
`;

    const pdf = await generatePDF(proofHTML);
    return Buffer.from(pdf);
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
    await page.setContent(html, { waitUntil: "networkidle0" as any });
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();
    return pdfBuffer;
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
};
