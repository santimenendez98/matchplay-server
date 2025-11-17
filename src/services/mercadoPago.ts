import { Payment, MercadoPagoConfig } from "mercadopago";
import { paymentDataBody, proofPaymentData } from "../types/Payment";
import { getReservationWithIdQuery } from "../db/ReservationQueries";
import { getOnlyDate } from "./DateService";
import puppeteer from "puppeteer";

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || "",
});

const payment = new Payment(client);

// Create payment
export const createPayment = async (data: paymentDataBody) => {
  try {
    const reservation = await getReservationWithIdQuery(data.reservation_id);

    if (reservation.rows.length === 0) {
      throw new Error("RESERVATION_NOT_FOUND");
    }

    // Only debit cards are accepted
    if (data.payment_method_id.slice(0, 3) !== "deb") {
      throw new Error("ONLY_DEBIT_CARDS_ARE_ACCEPTED");
    }

    // Format reservation date
    const reservationDate = getOnlyDate(reservation.rows[0].reservation_date);

    // Create payment
    const paymentRequest = await payment.create({
      body: {
        transaction_amount: data.amount,
        token: data.token,
        description: `Reservation nro ${data.reservation_id} - ${reservationDate} - ${reservation.rows[0].start_time} to ${reservation.rows[0].end_time}`,
        installments: 1,
        payment_method_id: data.payment_method_id,
        issuer_id: data.issuer_id,
        payer: {
          email: data.email,
          identification: {
            type: data.identification_type,
            number: data.identification_number,
          },
        },
      },
      requestOptions: { idempotencyKey: `reservation-${data.reservation_id}` },
    });

    return paymentRequest;
  } catch (error) {
    const err = error as Error;
    throw new Error(err.message);
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
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();
    return pdfBuffer;
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
};
