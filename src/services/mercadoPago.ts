import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import {
  bodyModel,
  MercadoPagoModel,
  mercadoPagoRequest,
} from "../types/Payment";

const mercadopago = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || "",
});

const preference = new Preference(mercadopago);
export const payment = new Payment(mercadopago);

export const createPayment = async (paymentData: mercadoPagoRequest) => {
  try {
    const { items, external_reference } = paymentData;
    console.log(items);

    const dataItems = items.map((i) => ({
      id: i.id,
      title: i.title,
      quantity: i.quantity,
      unit_price: i.unit_price,
      currency_id: "UYU",
    }));

    const data: MercadoPagoModel = {
      body: {
        items: dataItems,
        back_urls: {
          success: "www.example.com/success",
          failure: "www.example.com/failure",
          pending: "www.example.com/pending",
        },
        auto_return: "approved",
        external_reference: external_reference,
        notification_url: process.env.MERCADO_PAGO_NOTIFICATION_URL,
      },
    };

    const response = await preference.create(data);

    console.log("Payment created successfully");

    // Sandbox initial point for testing, you can change it to production later to init_point
    return response.sandbox_init_point;
  } catch (error) {
    console.error("Error creating payment:", error);
    throw error;
  }
};
