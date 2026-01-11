import {
  getReservationWithIdQuery,
  updatePreReserveStatusQuery,
  updateReservationStatusQuery,
} from "../../db/ReservationQueries";
import {
  getAccountByEmailQuery,
  getAccountByIdQuery,
} from "../../db/AccountQueries";
import { ReservationModel } from "../../types/Reservation";
import { AccountModel } from "../../types/Account";
import {
  createDebitPayment,
  mercadoPagoWebhook,
  generateProof,
  createBankTransfer,
  confirmTransferPayment,
  createCashPayment,
} from "../Payment";
import {
  createPaymentHistoryQuery,
  getPaymentByIdQuery,
  getPaymentByReservationAndAccount,
  updatePaymentStatusQuery,
} from "../../db/PaymentQueries";
import {
  createPayment,
  generateProofPayment,
  processMercadoPagoWebhook,
  verifyMercadoPagoSignature,
} from "../../services/mercadoPago";
import { getCurrentTime } from "../../services/DateService";
import { verifyCloudinaryFile } from "../../services/cloudinary";
import { emitPayment } from "../../services/webSocket";
import { historyPaymentModel } from "../../types/Payment";
import {
  getMatchByReservationQuery,
  getPlayerJoinedByMatchQuery,
  updatePaymentMethod,
} from "../../db/MatchQueries";
import { JoinMatchModel, MatchModel } from "../../types/Match";

jest.mock("../../middleware", () => ({
  authMiddleware: jest.fn((req, res, next) => next()),
  rolMiddleware: jest.fn(() => (req: any, res: any, next: any) => next()),
}));

jest.mock("../../services/webSocket", () => ({
  emitPaymentApproved: jest.fn(),
  emitPayment: jest.fn(),
}));

jest.mock("../../services/cloudinary", () => ({
  verifyCloudinaryFile: jest.fn(),
}));

jest.mock("../../services/DateService", () => ({
  getCurrentTime: jest.fn(),
}));

jest.mock("../../middleware/validatorErrors", () => ({
  handleValidationErrors: jest.fn((req, res, next) => next()),
}));

jest.mock("../../db/AccountQueries", () => {
  return {
    getAccountByEmailQuery: jest.fn(),
    getAccountByIdQuery: jest.fn(),
  };
});

jest.mock("../../db/ReservationQueries", () => {
  return {
    getReservationWithIdQuery: jest.fn(),
    updateReservationStatusQuery: jest.fn(),
    updatePreReserveStatusQuery: jest.fn(),
  };
});

jest.mock("../../db/MatchQueries", () => {
  return {
    getMatchByReservationQuery: jest.fn(),
    updatePaymentMethod: jest.fn(),
    getPlayerJoinedByMatchQuery: jest.fn(),
  };
});

jest.mock("../../db/PaymentQueries", () => ({
  getPaymentByReservationAndAccount: jest.fn(),
  getPaymentByIdQuery: jest.fn(),
  createPaymentHistoryQuery: jest.fn(),
  updatePaymentStatusQuery: jest.fn(),
}));

jest.mock("../../services/mercadoPago", () => ({
  createPayment: jest.fn(),
  processMercadoPagoWebhook: jest.fn(),
  verifyMercadoPagoSignature: jest.fn(),
  generateProofPayment: jest.fn(),
}));

describe("Payment", () => {
  const mockReservation: ReservationModel[] = [
    {
      id: "1",
      schedule_id: "1",
      account_id: "1",
      price: 100,
      start_time: "2024-06-01T10:00:00Z",
      end_time: "2024-06-01T11:00:00Z",
      time_reserved: 60,
      reservation_date: "2024-06-01",
      is_match: false,
      status: "pending",
    },
    {
      id: "2",
      schedule_id: "1",
      account_id: "1",
      price: 100,
      start_time: "2024-06-01T10:00:00Z",
      end_time: "2024-06-01T11:00:00Z",
      time_reserved: 60,
      reservation_date: "2024-06-01",
      is_match: true,
      status: "confirmed",
    },
  ];

  const mockAccount: AccountModel[] = [
    {
      id: "1",
      email: "test@example.com",
      password: "hashedpassword",
      name: "Test User",
      birthdate: "1990-01-01",
      phone: "1234567890",
      account_type: "user",
    },
  ];

  const mockPayment: historyPaymentModel[] = [
    {
      account_id: "1",
      reservation_id: "1",
      total_amount: 100,
      payment_method: "bank_transfer",
      payment_status: "pending",
      payment_date: "2024-06-01T09:00:00Z",
      paid_by: "1",
      mp_payment_id: undefined,
      proof_of_payment: "http://cloudinary.url/proof.jpg",
    },
    {
      account_id: "1",
      reservation_id: "2",
      total_amount: 25,
      payment_method: "bank_transfer",
      payment_status: "pending",
      payment_date: "2024-06-01T09:00:00Z",
      paid_by: "1",
      mp_payment_id: undefined,
      proof_of_payment: "http://cloudinary.url/proof.jpg",
    },
    {
      account_id: "1",
      reservation_id: "2",
      total_amount: 25,
      payment_method: "cash",
      payment_status: "pending",
      payment_date: "2024-06-01T09:00:00Z",
      paid_by: "1",
    },
  ];

  const mockMatch: MatchModel[] = [
    {
      id: "1",
      court_id: "1",
      reservation_id: "2",
      creator_id: "1",
      total_players: 4,
      current_players: 2,
      price_per_player: 25,
      status: "completed",
    },
  ];

  const mockPlayersJoined: JoinMatchModel[] = [
    {
      match_id: "1",
      player_id: "1",
      joined_at: "2024-05-31T12:00:00Z",
      payment_method: "cash",
    },
  ];

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    set: jest.fn().mockReturnThis(),
    send: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("MercadoPago Payment", () => {
    // Test case: Successful payment creation
    test("should create mercadopago payment successfully", async () => {
      (getReservationWithIdQuery as jest.Mock).mockResolvedValue({
        rows: mockReservation,
        rowCount: 1,
      });
      (getAccountByEmailQuery as jest.Mock).mockResolvedValue({
        rows: mockAccount,
        rowCount: 1,
      });
      (getPaymentByReservationAndAccount as jest.Mock).mockResolvedValue({
        rows: [],
        rowCount: 0,
      });
      (createPayment as jest.Mock).mockResolvedValue({
        id: "preference-123",
        init_point: "http://payment.url",
      });

      await createDebitPayment(
        {
          body: {
            reservation_id: "1",
            email: "test@example.com",
          },
        } as any,
        res as any
      );

      expect(getReservationWithIdQuery).toHaveBeenCalledWith("1");
      expect(getAccountByEmailQuery).toHaveBeenCalledWith("test@example.com");
      expect(getPaymentByReservationAndAccount).toHaveBeenCalledWith("1", "1");
      expect(createPayment).toHaveBeenCalledWith("1", "1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Payment created successfully",
        data: {
          url: "preference-123",
        },
      });
    });

    // Test case: Reservation not found
    test("should return 404 if reservation not found", async () => {
      (getReservationWithIdQuery as jest.Mock).mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      await createDebitPayment(
        {
          body: {
            reservation_id: "999",
            email: "test@example.com",
          },
        } as any,
        res as any
      );

      expect(getReservationWithIdQuery).toHaveBeenCalledWith("999");
      expect(createPayment).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Reservation not found",
      });
    });

    // Test case: Account not found
    test("should return 404 if account not found", async () => {
      (getReservationWithIdQuery as jest.Mock).mockResolvedValue({
        rows: mockReservation,
        rowCount: 1,
      });
      (getAccountByEmailQuery as jest.Mock).mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      await createDebitPayment(
        {
          body: {
            reservation_id: "1",
            email: "notfound@example.com",
          },
        } as any,
        res as any
      );

      expect(getReservationWithIdQuery).toHaveBeenCalledWith("1");
      expect(getAccountByEmailQuery).toHaveBeenCalledWith(
        "notfound@example.com"
      );
      expect(createPayment).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Account not found",
      });
    });

    // Test case: Reservation already paid
    test("should return 400 if reservation already paid", async () => {
      (getReservationWithIdQuery as jest.Mock).mockResolvedValue({
        rows: mockReservation,
        rowCount: 1,
      });
      (getAccountByEmailQuery as jest.Mock).mockResolvedValue({
        rows: mockAccount,
        rowCount: 1,
      });
      (getPaymentByReservationAndAccount as jest.Mock).mockResolvedValue({
        rows: [{ id: "payment-1", payment_status: "completed" }],
        rowCount: 1,
      });

      await createDebitPayment(
        {
          body: {
            reservation_id: "1",
            email: "test@example.com",
          },
        } as any,
        res as any
      );

      expect(getPaymentByReservationAndAccount).toHaveBeenCalledWith("1", "1");
      expect(createPayment).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "The reservation has already been paid",
      });
    });

    // Test case: Match reservation not confirmed
    test("should return 400 if match reservation is not confirmed", async () => {
      const matchReservation = {
        ...mockReservation[0],
        is_match: true,
        status: "pending",
      };

      (getReservationWithIdQuery as jest.Mock).mockResolvedValue({
        rows: [matchReservation],
        rowCount: 1,
      });
      (getAccountByEmailQuery as jest.Mock).mockResolvedValue({
        rows: mockAccount,
        rowCount: 1,
      });
      (getPaymentByReservationAndAccount as jest.Mock).mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      await createDebitPayment(
        {
          body: {
            reservation_id: "1",
            email: "test@example.com",
          },
        } as any,
        res as any
      );

      expect(getReservationWithIdQuery).toHaveBeenCalledWith("1");
      expect(createPayment).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "The match reservation must be confirmed before payment",
      });
    });

    // Test case: Successful payment creation for confirmed match
    test("should create payment for confirmed match reservation", async () => {
      const matchReservation = {
        ...mockReservation[0],
        is_match: true,
        status: "confirmed",
      };

      (getReservationWithIdQuery as jest.Mock).mockResolvedValue({
        rows: [matchReservation],
        rowCount: 1,
      });
      (getAccountByEmailQuery as jest.Mock).mockResolvedValue({
        rows: mockAccount,
        rowCount: 1,
      });
      (getPaymentByReservationAndAccount as jest.Mock).mockResolvedValue({
        rows: [],
        rowCount: 0,
      });
      (createPayment as jest.Mock).mockResolvedValue({
        id: "preference-456",
        init_point: "http://match-payment.url",
      });

      await createDebitPayment(
        {
          body: {
            reservation_id: "1",
            email: "test@example.com",
          },
        } as any,
        res as any
      );

      expect(getReservationWithIdQuery).toHaveBeenCalledWith("1");
      expect(createPayment).toHaveBeenCalledWith("1", "1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Payment created successfully",
        data: {
          url: "preference-456",
        },
      });
    });

    // Test case: General error handling
    test("should return 400 on general error", async () => {
      (getReservationWithIdQuery as jest.Mock).mockRejectedValue(
        new Error("Database connection failed")
      );

      await createDebitPayment(
        {
          body: {
            reservation_id: "1",
            email: "test@example.com",
          },
        } as any,
        res as any
      );

      expect(getReservationWithIdQuery).toHaveBeenCalledWith("1");
      expect(createPayment).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "An error ocurred",
        message: "Database connection failed",
      });
    });
  });

  describe("MercadoPago Webhook", () => {
    // Additional tests for webhook can be added here
    test("should process webhook successfully", async () => {
      (verifyMercadoPagoSignature as jest.Mock).mockReturnValue(true);

      (processMercadoPagoWebhook as jest.Mock).mockResolvedValue(undefined);

      await mercadoPagoWebhook(
        {
          headers: {
            "x-signature": "test",
            "x-request-id": "test",
          },
          rawBody: JSON.stringify({
            type: "payment",
            data: { id: "payment-id-123" },
          }),
          body: {
            type: "payment",
            data: { id: "payment-id-123" },
          },
        } as any,
        res as any
      );

      expect(verifyMercadoPagoSignature).toHaveBeenCalled();
      expect(processMercadoPagoWebhook).toHaveBeenCalledWith("payment", {
        id: "payment-id-123",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith("OK");
    });

    // Test case: Invalid signature
    test("should return 400 for invalid signature", async () => {
      (verifyMercadoPagoSignature as jest.Mock).mockReturnValue(false);

      await mercadoPagoWebhook(
        {
          headers: {
            "x-signature": "invalid",
            "x-request-id": "test",
          },
          rawBody: JSON.stringify({
            type: "payment",
            data: { id: "payment-id-123" },
          }),
          body: {
            type: "payment",
            data: { id: "payment-id-123" },
          },
        } as any,
        res as any
      );

      expect(verifyMercadoPagoSignature).toHaveBeenCalled();
      expect(processMercadoPagoWebhook).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "An error ocurred",
        message: "Invalid signature",
      });
    });

    // Test case: Missing signature headers
    test("should return 400 for missing signature headers", async () => {
      await mercadoPagoWebhook(
        {
          headers: {},
          rawBody: JSON.stringify({
            type: "payment",
            data: { id: "payment-id-123" },
          }),
          body: {
            type: "payment",
            data: { id: "payment-id-123" },
          },
        } as any,
        res as any
      );

      expect(verifyMercadoPagoSignature).not.toHaveBeenCalled();
      expect(processMercadoPagoWebhook).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "An error ocurred",
        message: "Missing signature headers",
      });
    });

    // Test case: Invalid payload
    test("should return 400 for invalid payload", async () => {
      (verifyMercadoPagoSignature as jest.Mock).mockReturnValue(true);

      await mercadoPagoWebhook(
        {
          headers: {
            "x-signature": "test",
            "x-request-id": "test",
          },
          rawBody: JSON.stringify({
            invalid: "payload",
          }),
          body: {
            invalid: "payload",
          },
        } as any,
        res as any
      );

      expect(verifyMercadoPagoSignature).toHaveBeenCalled();
      expect(processMercadoPagoWebhook).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "An error ocurred",
        message: "Invalid payload",
      });
    });

    // Test case: General error handling
    test("should return 400 on general error", async () => {
      (verifyMercadoPagoSignature as jest.Mock).mockReturnValue(true);
      (processMercadoPagoWebhook as jest.Mock).mockRejectedValue(
        new Error("Processing failed")
      );

      await mercadoPagoWebhook(
        {
          headers: {
            "x-signature": "test",
            "x-request-id": "test",
          },
          rawBody: JSON.stringify({
            type: "payment",
            data: { id: "payment-id-123" },
          }),
          body: {
            type: "payment",
            data: { id: "payment-id-123" },
          },
        } as any,
        res as any
      );

      expect(verifyMercadoPagoSignature).toHaveBeenCalled();
      expect(processMercadoPagoWebhook).toHaveBeenCalledWith("payment", {
        id: "payment-id-123",
      });
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "An error ocurred",
        message: "Processing failed",
      });
    });
  });

  describe("Generate Proof Payment", () => {
    // Tests for generate proof payment success
    test("should generate proof payment successfully", async () => {
      const fakeBuffer = Buffer.from("http://new.proof.url");

      (getPaymentByIdQuery as jest.Mock).mockResolvedValue({
        rows: [{ id: "payment-1", proof_url: "http://proof.url" }],
        rowCount: 1,
      });

      (generateProofPayment as jest.Mock).mockResolvedValue(fakeBuffer);

      await generateProof(
        {
          body: {
            payment_id: "payment-1",
          },
        } as any,
        res as any
      );

      expect(getPaymentByIdQuery).toHaveBeenCalledWith("payment-1");
      expect(generateProofPayment).toHaveBeenCalledWith({
        id: "payment-1",
        proof_url: "http://proof.url",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(fakeBuffer);
    });

    // Test case: Payment not found
    test("should return 404 if payment not found", async () => {
      (getPaymentByIdQuery as jest.Mock).mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      await generateProof(
        {
          body: {
            payment_id: "payment-1",
          },
        } as any,
        res as any
      );

      expect(getPaymentByIdQuery).toHaveBeenCalledWith("payment-1");
      expect(generateProofPayment).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Payment not found",
      });
    });

    // Test case: Generate proof error
    test("should return 400 on generate proof error", async () => {
      (getPaymentByIdQuery as jest.Mock).mockResolvedValue({
        rows: [{ id: "payment-1", proof_url: "http://proof.url" }],
        rowCount: 1,
      });

      (generateProofPayment as jest.Mock).mockRejectedValue(
        new Error("Failed to generate proof")
      );

      await generateProof(
        {
          body: {
            payment_id: "payment-1",
          },
        } as any,
        res as any
      );

      expect(getPaymentByIdQuery).toHaveBeenCalledWith("payment-1");
      expect(generateProofPayment).toHaveBeenCalledWith({
        id: "payment-1",
        proof_url: "http://proof.url",
      });
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Failed to generate proof",
      });
    });

    // Test case: General error handling
    test("should return 500 on general error", async () => {
      (getPaymentByIdQuery as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      await generateProof(
        {
          body: {
            payment_id: "payment-1",
          },
        } as any,
        res as any
      );

      expect(getPaymentByIdQuery).toHaveBeenCalledWith("payment-1");
      expect(generateProofPayment).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Database error",
      });
    });
  });

  describe("Bank Transfer Payment", () => {
    // Tests for bank transfer payment reservation success
    test("should create bank transfer payment successfully for reservation", async () => {
      (getReservationWithIdQuery as jest.Mock).mockResolvedValue({
        rows: mockReservation,
        rowCount: 1,
      });

      (getAccountByIdQuery as jest.Mock).mockResolvedValue({
        rows: mockAccount,
        rowCount: 1,
      });

      (getCurrentTime as jest.Mock).mockReturnValue("2024-06-01T09:00:00Z");

      (getPaymentByReservationAndAccount as jest.Mock).mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      (verifyCloudinaryFile as jest.Mock).mockResolvedValue(true);

      (createPaymentHistoryQuery as jest.Mock).mockResolvedValue({
        rows: mockPayment,
        rowCount: 1,
      });

      (emitPayment as jest.Mock).mockResolvedValue(undefined);

      await createBankTransfer(
        {
          body: {
            reservation_id: "1",
            account_id: "1",
            proof_url: "http://cloudinary.url/proof.jpg",
          },
        } as any,
        res as any
      );

      expect(getReservationWithIdQuery).toHaveBeenCalledWith("1");
      expect(getAccountByIdQuery).toHaveBeenCalledWith("1");
      expect(getPaymentByReservationAndAccount).toHaveBeenCalledWith("1", "1");
      expect(verifyCloudinaryFile).toHaveBeenCalledWith(
        "http://cloudinary.url/proof.jpg"
      );
      expect(createPaymentHistoryQuery).toHaveBeenCalledWith(mockPayment[0]);
      expect(emitPayment).toHaveBeenCalledWith("1", undefined, "pending");

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Payment created successfully",
        data: mockPayment[0],
      });
    });

    // Test for bank transfer payment match success
    test("should create bank transfer payment successfully for match reservation", async () => {
      (getReservationWithIdQuery as jest.Mock).mockResolvedValue({
        rows: [mockReservation[1]],
        rowCount: 1,
      });

      (getAccountByIdQuery as jest.Mock).mockResolvedValue({
        rows: mockAccount,
        rowCount: 1,
      });

      (getCurrentTime as jest.Mock).mockReturnValue("2024-06-01T09:00:00Z");

      (getPaymentByReservationAndAccount as jest.Mock).mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      (verifyCloudinaryFile as jest.Mock).mockResolvedValue(true);

      (getMatchByReservationQuery as jest.Mock).mockResolvedValue({
        rows: mockMatch,
        rowCount: 1,
      });

      (createPaymentHistoryQuery as jest.Mock).mockResolvedValue({
        rows: [mockPayment[1]],
        rowCount: 1,
      });

      (emitPayment as jest.Mock).mockResolvedValue(undefined);

      await createBankTransfer(
        {
          body: {
            reservation_id: "2",
            account_id: "1",
            proof_url: "http://cloudinary.url/proof.jpg",
          },
        } as any,
        res as any
      );

      expect(getReservationWithIdQuery).toHaveBeenCalledWith("2");
      expect(getAccountByIdQuery).toHaveBeenCalledWith("1");
      expect(getPaymentByReservationAndAccount).toHaveBeenCalledWith("2", "1");
      expect(verifyCloudinaryFile).toHaveBeenCalledWith(
        "http://cloudinary.url/proof.jpg"
      );
      expect(getMatchByReservationQuery).toHaveBeenCalledWith("2");
      expect(createPaymentHistoryQuery).toHaveBeenCalledWith(mockPayment[1]);
      expect(emitPayment).toHaveBeenCalledWith("2", undefined, "pending");

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Payment created successfully",
        data: mockPayment[1],
      });
    });

    // Test case: Reservation not found
    test("should return 404 if reservation not found", async () => {
      (getReservationWithIdQuery as jest.Mock).mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      await createBankTransfer(
        {
          body: {
            reservation_id: "999",
            account_id: "1",
            proof_url: "http://cloudinary.url/proof.jpg",
          },
        } as any,
        res as any
      );

      expect(getReservationWithIdQuery).toHaveBeenCalledWith("999");
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Reservation not found",
      });
    });

    // Test case: Account not found
    test("should return 404 if account not found", async () => {
      (getReservationWithIdQuery as jest.Mock).mockResolvedValue({
        rows: mockReservation,
        rowCount: 1,
      });

      (getAccountByIdQuery as jest.Mock).mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      await createBankTransfer(
        {
          body: {
            reservation_id: "1",
            account_id: "999",
            proof_url: "http://cloudinary.url/proof.jpg",
          },
        } as any,
        res as any
      );

      expect(getReservationWithIdQuery).toHaveBeenCalledWith("1");
      expect(getAccountByIdQuery).toHaveBeenCalledWith("999");
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Account not found",
      });
    });

    // Test case: Payment already exists
    test("should return 400 if payment already exists for reservation and account", async () => {
      (getReservationWithIdQuery as jest.Mock).mockResolvedValue({
        rows: [mockReservation[0]],
        rowCount: 1,
      });

      (getAccountByIdQuery as jest.Mock).mockResolvedValue({
        rows: mockAccount,
        rowCount: 1,
      });

      (getPaymentByReservationAndAccount as jest.Mock).mockResolvedValue({
        rows: [mockPayment[0]],
        rowCount: 1,
      });

      await createBankTransfer(
        {
          body: {
            reservation_id: "1",
            account_id: "1",
            proof_url: "http://cloudinary.url/proof.jpg",
          },
        } as any,
        res as any
      );

      expect(getPaymentByReservationAndAccount).toHaveBeenCalledWith("1", "1");
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error:
          "There is already a pending or completed payment for this reservation",
      });
    });

    // Test case: cloudinary file verification fails
    test("should return 400 if cloudinary file verification fails", async () => {
      (getReservationWithIdQuery as jest.Mock).mockResolvedValue({
        rows: mockReservation,
        rowCount: 1,
      });

      (getAccountByIdQuery as jest.Mock).mockResolvedValue({
        rows: mockAccount,
        rowCount: 1,
      });

      (getPaymentByReservationAndAccount as jest.Mock).mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      (verifyCloudinaryFile as jest.Mock).mockResolvedValue(false);

      await createBankTransfer(
        {
          body: {
            reservation_id: "1",
            account_id: "1",
            proof_url: "http://cloudinary.url/proof.jpg",
          },
        } as any,
        res as any
      );

      expect(verifyCloudinaryFile).toHaveBeenCalledWith(
        "http://cloudinary.url/proof.jpg"
      );
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "File not found",
      });
    });

    // Test case: Match not found
    test("should return 404 if match not found for match reservation", async () => {
      (getReservationWithIdQuery as jest.Mock).mockResolvedValue({
        rows: [mockReservation[1]],
        rowCount: 1,
      });

      (getAccountByIdQuery as jest.Mock).mockResolvedValue({
        rows: mockAccount,
        rowCount: 1,
      });

      (getPaymentByReservationAndAccount as jest.Mock).mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      (verifyCloudinaryFile as jest.Mock).mockResolvedValue(true);

      (getMatchByReservationQuery as jest.Mock).mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      await createBankTransfer(
        {
          body: {
            reservation_id: "2",
            account_id: "1",
            proof_url: "http://cloudinary.url/proof.jpg",
          },
        } as any,
        res as any
      );

      expect(getMatchByReservationQuery).toHaveBeenCalledWith("2");
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Match not found",
      });
    });

    // Test case: Match is not confirmed
    test("should return 400 if match reservation is not confirmed", async () => {
      const unconfirmedMatch = {
        ...mockMatch[0],
        status: "pending",
      };

      (getReservationWithIdQuery as jest.Mock).mockResolvedValue({
        rows: [mockReservation[1]],
        rowCount: 1,
      });

      (getAccountByIdQuery as jest.Mock).mockResolvedValue({
        rows: mockAccount,
        rowCount: 1,
      });

      (getPaymentByReservationAndAccount as jest.Mock).mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      (verifyCloudinaryFile as jest.Mock).mockResolvedValue(true);

      (getMatchByReservationQuery as jest.Mock).mockResolvedValue({
        rows: [unconfirmedMatch],
        rowCount: 1,
      });

      await createBankTransfer(
        {
          body: {
            reservation_id: "2",
            account_id: "1",
            proof_url: "http://cloudinary.url/proof.jpg",
          },
        } as any,
        res as any
      );

      expect(getMatchByReservationQuery).toHaveBeenCalledWith("2");
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: `Match is already ${unconfirmedMatch.status}`,
      });
    });

    // Test case: Create payment history failure
    test("should return 400 if create payment history fails", async () => {
      (getReservationWithIdQuery as jest.Mock).mockResolvedValue({
        rows: mockReservation,
        rowCount: 1,
      });

      (getAccountByIdQuery as jest.Mock).mockResolvedValue({
        rows: mockAccount,
        rowCount: 1,
      });

      (getPaymentByReservationAndAccount as jest.Mock).mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      (verifyCloudinaryFile as jest.Mock).mockResolvedValue(true);

      (createPaymentHistoryQuery as jest.Mock).mockRejectedValue(
        new Error("Error to create payment")
      );

      await createBankTransfer(
        {
          body: {
            reservation_id: "2",
            account_id: "1",
            proof_url: "http://cloudinary.url/proof.jpg",
          },
        } as any,
        res as any
      );

      expect(getReservationWithIdQuery).toHaveBeenCalledWith("2");
      expect(getAccountByIdQuery).toHaveBeenCalledWith("1");
      expect(getPaymentByReservationAndAccount).toHaveBeenCalledWith("2", "1");
      expect(verifyCloudinaryFile).toHaveBeenCalledWith(
        "http://cloudinary.url/proof.jpg"
      );
      expect(createPaymentHistoryQuery).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "An error ocurred",
        message: "Error to create payment",
      });
    });

    // Test case: General error handling
    test("should return 400 on general error", async () => {
      (getReservationWithIdQuery as jest.Mock).mockRejectedValue(
        new Error("Database connection failed")
      );

      await createBankTransfer(
        {
          body: {
            reservation_id: "1",
            account_id: "1",
            proof_url: "http://cloudinary.url/proof.jpg",
          },
        } as any,
        res as any
      );

      expect(getReservationWithIdQuery).toHaveBeenCalledWith("1");
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "An error ocurred",
        message: "Database connection failed",
      });
    });
  });

  describe("Confirm Transfer Payment", () => {
    // Confirm reservation transfer payment sucessfully
    test("should confirm transfer payment successfully", async () => {
      (getPaymentByIdQuery as jest.Mock).mockResolvedValue({
        rows: [mockPayment[0]],
        rowCount: 1,
      });

      (getReservationWithIdQuery as jest.Mock).mockResolvedValue({
        rows: [mockReservation[0]],
        rowCount: 1,
      });

      (updateReservationStatusQuery as jest.Mock).mockResolvedValue({
        rows: [],
        rowCount: 1,
      });

      (updatePaymentStatusQuery as jest.Mock).mockResolvedValue({
        rows: [],
        rowCount: 1,
      });

      await confirmTransferPayment(
        {
          body: {
            payment_id: "1",
            status: "completed",
          },
        } as any,
        res as any
      );

      expect(getPaymentByIdQuery).toHaveBeenCalledWith("1");
      expect(getReservationWithIdQuery).toHaveBeenCalledWith(
        mockPayment[0].reservation_id
      );
      expect(updateReservationStatusQuery).toHaveBeenCalledWith(
        mockPayment[0].reservation_id,
        "confirmed"
      );
      expect(updatePaymentStatusQuery).toHaveBeenCalledWith("1", "completed");
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Payment confirmed successfully",
      });
    });

    // Confirm match transfer payment sucessfully
    test("should confirm match transfer payment successfully", async () => {
      (getPaymentByIdQuery as jest.Mock).mockResolvedValue({
        rows: [mockPayment[1]],
        rowCount: 1,
      });

      (getReservationWithIdQuery as jest.Mock).mockResolvedValue({
        rows: [mockReservation[1]],
        rowCount: 1,
      });

      (getMatchByReservationQuery as jest.Mock).mockResolvedValue({
        rows: [mockMatch[0]],
        rowCount: 1,
      });

      (updatePaymentMethod as jest.Mock).mockResolvedValue({
        rows: [],
        rowCount: 1,
      });

      (updatePreReserveStatusQuery as jest.Mock).mockResolvedValue({
        rows: [],
        rowCount: 1,
      });

      (updatePaymentStatusQuery as jest.Mock).mockResolvedValue({
        rows: [],
        rowCount: 1,
      });

      await confirmTransferPayment(
        {
          body: {
            payment_id: "1",
            status: "completed",
          },
        } as any,
        res as any
      );

      expect(getPaymentByIdQuery).toHaveBeenCalledWith("1");
      expect(getReservationWithIdQuery).toHaveBeenCalledWith(
        mockPayment[1].reservation_id
      );
      expect(getMatchByReservationQuery).toHaveBeenCalledWith(
        mockPayment[1].reservation_id
      );
      expect(updatePaymentMethod).toHaveBeenCalledWith({
        match_id: mockMatch[0].id,
        player_id: mockPayment[1].paid_by,
        payment_method: "bank_transfer",
        payment_status: "completed",
      });
      expect(updatePreReserveStatusQuery).toHaveBeenCalledWith(
        mockReservation[1].id,
        "completed"
      );
      expect(updatePaymentStatusQuery).toHaveBeenCalledWith("1", "completed");
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Payment confirmed successfully",
      });
    });

    // Test case: Payment not found
    test("should return 404 if payment not found", async () => {
      (getPaymentByIdQuery as jest.Mock).mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      await confirmTransferPayment(
        {
          body: {
            payment_id: "999",
            status: "completed",
          },
        } as any,
        res as any
      );

      expect(getPaymentByIdQuery).toHaveBeenCalledWith("999");
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Payment not found",
      });
    });

    // Test case: Reservation not found
    test("should return 404 if reservation not found", async () => {
      (getPaymentByIdQuery as jest.Mock).mockResolvedValue({
        rows: [mockPayment[0]],
        rowCount: 1,
      });

      (getReservationWithIdQuery as jest.Mock).mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      await confirmTransferPayment(
        {
          body: {
            payment_id: "1",
            status: "completed",
          },
        } as any,
        res as any
      );
      expect(getPaymentByIdQuery).toHaveBeenCalledWith("1");
      expect(getReservationWithIdQuery).toHaveBeenCalledWith(
        mockPayment[0].reservation_id
      );
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Reservation not found",
      });
    });

    // Test case: Match not found
    test("should return 404 if match not found for match reservation", async () => {
      (getPaymentByIdQuery as jest.Mock).mockResolvedValue({
        rows: [mockPayment[1]],
        rowCount: 1,
      });

      (getReservationWithIdQuery as jest.Mock).mockResolvedValue({
        rows: [mockReservation[1]],
        rowCount: 1,
      });

      (getMatchByReservationQuery as jest.Mock).mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      await confirmTransferPayment(
        {
          body: {
            payment_id: "1",
            status: "completed",
          },
        } as any,
        res as any
      );

      expect(getPaymentByIdQuery).toHaveBeenCalledWith("1");
      expect(getReservationWithIdQuery).toHaveBeenCalledWith(
        mockPayment[1].reservation_id
      );
      expect(getMatchByReservationQuery).toHaveBeenCalledWith(
        mockPayment[1].reservation_id
      );
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Match not found",
      });
    });

    // Test case: General error handling
    test("should return 400 on general error", async () => {
      (getPaymentByIdQuery as jest.Mock).mockRejectedValue(
        new Error("Database connection failed")
      );

      await confirmTransferPayment(
        {
          body: {
            payment_id: "1",
            status: "completed",
          },
        } as any,
        res as any
      );

      expect(getPaymentByIdQuery).toHaveBeenCalledWith("1");
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "An error ocurred",
        message: "Database connection failed",
      });
    });
  });

  describe("Cash Payment", () => {
    // Test for cash payment reservation success
    test("should create cash payment successfully for reservation", async () => {
      (getReservationWithIdQuery as jest.Mock).mockResolvedValue({
        rows: mockReservation,
        rowCount: 1,
      });

      (getAccountByIdQuery as jest.Mock).mockResolvedValue({
        rows: mockAccount,
        rowCount: 1,
      });

      (getPaymentByReservationAndAccount as jest.Mock).mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      (createPaymentHistoryQuery as jest.Mock).mockResolvedValue({
        rows: mockPayment,
        rowCount: 1,
      });

      (updateReservationStatusQuery as jest.Mock).mockResolvedValue({
        rows: [],
        rowCount: 1,
      });

      (emitPayment as jest.Mock).mockResolvedValue(undefined);

      await createCashPayment(
        {
          body: {
            reservation_id: "1",
            account_id: "1",
          },
        } as any,
        res as any
      );

      expect(getReservationWithIdQuery).toHaveBeenCalledWith("1");
      expect(getAccountByIdQuery).toHaveBeenCalledWith("1");
      expect(getPaymentByReservationAndAccount).toHaveBeenCalledWith("1", "1");
      expect(createPaymentHistoryQuery).toHaveBeenCalled();
      expect(updateReservationStatusQuery).toHaveBeenCalledWith(
        "1",
        "confirmed"
      );
      expect(emitPayment).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Cash payment created successfully",
      });
    });

    // Test for cash payment match success
    test("should create cash payment successfully for match reservation", async () => {
      (getReservationWithIdQuery as jest.Mock).mockResolvedValue({
        rows: [mockReservation[1]],
        rowCount: 1,
      });

      (getAccountByIdQuery as jest.Mock).mockResolvedValue({
        rows: mockAccount,
        rowCount: 1,
      });

      (getMatchByReservationQuery as jest.Mock).mockResolvedValue({
        rows: mockMatch,
        rowCount: 1,
      });

      (getPlayerJoinedByMatchQuery as jest.Mock).mockResolvedValue({
        rows: mockPlayersJoined,
        rowCount: 2,
      });

      (getPaymentByReservationAndAccount as jest.Mock).mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      (createPaymentHistoryQuery as jest.Mock).mockResolvedValue({
        rows: [mockPayment[1]],
        rowCount: 1,
      });

      (updatePaymentMethod as jest.Mock).mockResolvedValue({
        rows: [],
        rowCount: 1,
      });

      (emitPayment as jest.Mock).mockResolvedValue(undefined);

      await createCashPayment(
        {
          body: {
            reservation_id: "2",
            account_id: "1",
          },
        } as any,
        res as any
      );

      expect(getReservationWithIdQuery).toHaveBeenCalledWith("2");
      expect(getAccountByIdQuery).toHaveBeenCalledWith("1");
      expect(getMatchByReservationQuery).toHaveBeenCalledWith("2");
      expect(getPlayerJoinedByMatchQuery).toHaveBeenCalledWith("1", "1");
      expect(getPaymentByReservationAndAccount).toHaveBeenCalledWith("2", "1");
      expect(createPaymentHistoryQuery).toHaveBeenCalledWith(mockPayment[2]);
      expect(updatePaymentMethod).toHaveBeenCalledWith({
        match_id: mockMatch[0].id,
        player_id: mockPayment[1].paid_by,
        payment_method: "cash",
        payment_status: "pending",
      });
      expect(emitPayment).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Cash payment created successfully",
      });
    });

    // Test case: Reservation not found
    test("should return 404 if reservation not found", async () => {
      (getReservationWithIdQuery as jest.Mock).mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      await createCashPayment(
        {
          body: {
            reservation_id: "999",
            account_id: "1",
          },
        } as any,
        res as any
      );

      expect(getReservationWithIdQuery).toHaveBeenCalledWith("999");
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Reservation not found",
      });
    });

    // Test case: Account not found
    test("should return 404 if account not found", async () => {
      (getReservationWithIdQuery as jest.Mock).mockResolvedValue({
        rows: mockReservation,
        rowCount: 1,
      });

      (getAccountByIdQuery as jest.Mock).mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      await createCashPayment(
        {
          body: {
            reservation_id: "1",
            account_id: "999",
          },
        } as any,
        res as any
      );

      expect(getReservationWithIdQuery).toHaveBeenCalledWith("1");
      expect(getAccountByIdQuery).toHaveBeenCalledWith("999");
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Account not found",
      });
    });

    // Test case: Match not found
    test("should return 404 if match not found for match reservation", async () => {
      (getReservationWithIdQuery as jest.Mock).mockResolvedValue({
        rows: [mockReservation[1]],
        rowCount: 1,
      });

      (getAccountByIdQuery as jest.Mock).mockResolvedValue({
        rows: mockAccount,
        rowCount: 1,
      });

      (getMatchByReservationQuery as jest.Mock).mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      await createCashPayment(
        {
          body: {
            reservation_id: "2",
            account_id: "1",
          },
        } as any,
        res as any
      );

      expect(getMatchByReservationQuery).toHaveBeenCalledWith("2");
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Match not found",
      });
    });

    // Test case: Match is not confirmed
    test("should return 400 if match reservation is not confirmed", async () => {
      const unconfirmedMatch = {
        ...mockMatch[0],
        status: "pending",
      };

      (getReservationWithIdQuery as jest.Mock).mockResolvedValue({
        rows: [mockReservation[1]],
        rowCount: 1,
      });

      (getAccountByIdQuery as jest.Mock).mockResolvedValue({
        rows: mockAccount,
        rowCount: 1,
      });

      (getMatchByReservationQuery as jest.Mock).mockResolvedValue({
        rows: [unconfirmedMatch],
        rowCount: 1,
      });

      await createCashPayment(
        {
          body: {
            reservation_id: "2",
            account_id: "1",
          },
        } as any,
        res as any
      );

      expect(getMatchByReservationQuery).toHaveBeenCalledWith("2");
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: `Match is already ${unconfirmedMatch.status}`,
      });
    });

    // Test case: Player not found in match
    test("should return 404 if player not found in match", async () => {
      (getReservationWithIdQuery as jest.Mock).mockResolvedValue({
        rows: [mockReservation[1]],
        rowCount: 1,
      });

      (getAccountByIdQuery as jest.Mock).mockResolvedValue({
        rows: mockAccount,
        rowCount: 1,
      });

      (getMatchByReservationQuery as jest.Mock).mockResolvedValue({
        rows: mockMatch,
        rowCount: 1,
      });

      (getPlayerJoinedByMatchQuery as jest.Mock).mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      await createCashPayment(
        {
          body: {
            reservation_id: "2",
            account_id: "1",
          },
        } as any,
        res as any
      );

      expect(getPlayerJoinedByMatchQuery).toHaveBeenCalledWith("1", "1");
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Player not found in match",
      });
    });

    // Test case: Player aleary paid in match
    test("should return 400 if player already paid in match", async () => {
      (getReservationWithIdQuery as jest.Mock).mockResolvedValue({
        rows: [mockReservation[1]],
        rowCount: 1,
      });

      (getAccountByIdQuery as jest.Mock).mockResolvedValue({
        rows: mockAccount,
        rowCount: 1,
      });

      (getMatchByReservationQuery as jest.Mock).mockResolvedValue({
        rows: mockMatch,
        rowCount: 1,
      });

      (getPlayerJoinedByMatchQuery as jest.Mock).mockResolvedValue({
        rows: mockPlayersJoined,
        rowCount: 1,
      });

      (getPaymentByReservationAndAccount as jest.Mock).mockResolvedValue({
        rows: [{ ...mockPlayersJoined[0], payment_status: "completed" }],
        rowCount: 0,
      });

      await createCashPayment(
        {
          body: {
            reservation_id: "2",
            account_id: "1",
          },
        } as any,
        res as any
      );

      expect(getPaymentByReservationAndAccount).toHaveBeenCalledWith("2", "1");
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "The player has already paid for this match",
      });
    });

    // Test case: Reservation has already paid
    test("should return 400 if reservation has already paid", async () => {
      (getReservationWithIdQuery as jest.Mock).mockResolvedValue({
        rows: [mockReservation[0]],
        rowCount: 1,
      });

      (getAccountByIdQuery as jest.Mock).mockResolvedValue({
        rows: mockAccount,
        rowCount: 1,
      });

      (getPaymentByReservationAndAccount as jest.Mock).mockResolvedValue({
        rows: [mockPayment[0]],
        rowCount: 1,
      });

      await createCashPayment(
        {
          body: {
            reservation_id: "1",
            account_id: "1",
          },
        } as any,
        res as any
      );

      expect(getPaymentByReservationAndAccount).toHaveBeenCalledWith("1", "1");
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "The reservation has already been paid",
      });
    });

    // Test case: General error handling
    test("should return 400 on general error", async () => {
      (getReservationWithIdQuery as jest.Mock).mockRejectedValue(
        new Error("Database connection failed")
      );

      await createCashPayment(
        {
          body: {
            reservation_id: "1",
            account_id: "1",
          },
        } as any,
        res as any
      );

      expect(getReservationWithIdQuery).toHaveBeenCalledWith("1");
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "An error ocurred",
        message: "Database connection failed",
      });
    });
  });
});
