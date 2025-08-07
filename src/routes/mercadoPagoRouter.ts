import { Router } from "express";
import { mercadoPagoWebhook } from "../controllers/MercadoPago";

export const mercadoPagoRouter = Router();

mercadoPagoRouter.post("/", mercadoPagoWebhook);

export default mercadoPagoRouter;
