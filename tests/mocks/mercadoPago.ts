// Stubs for the mercadoPago service so tests don't hit real APIs.

export const createPreference = jest.fn();
export const getPayment = jest.fn();
export const verifyWebhookSignature = jest.fn(() => true);
export const generateProofPayment = jest.fn();
export const generatePDF = jest.fn();
