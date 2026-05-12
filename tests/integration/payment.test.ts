jest.mock("pg", () => require("../mocks/pg"));
jest.mock("../../src/services/webSocket", () => require("../mocks/webSocket"));
jest.mock("../../src/services/mercadoPago", () => require("../mocks/mercadoPago"));
jest.mock("../../src/services/cloudinary", () => require("../mocks/cloudinary"));

import request from "supertest";
import { buildApp } from "../helpers/buildApp";
import { setupQueryStubs, resetQueryStubs } from "../helpers/queryMock";
import { bearer } from "../helpers/auth";

const app = buildApp();
const mp = require("../../src/services/mercadoPago");
const cloud = require("../../src/services/cloudinary");

const validDebitBody = {
  reservation_id: "10",
  amount: 800,
  payment_method_id: "debit_card",
  token: "tok_123",
  email: "a@b.com",
  identification_type: "CI",
  identification_number: "12345678",
};

describe("Payment router", () => {
  afterEach(() => {
    resetQueryStubs();
    (mp.createPayment as jest.Mock).mockReset();
    (mp.getPayment as jest.Mock).mockReset();
    (mp.generateProofPayment as jest.Mock).mockReset();
    (cloud.verifyCloudinaryFile as jest.Mock).mockReset();
  });

  describe("POST /api/payment/pay (debit)", () => {
    it("requires auth", async () => {
      const res = await request(app).post("/api/payment/pay").send(validDebitBody);
      expect(res.status).toBe(401);
    });

    it("returns 400 when validation fails", async () => {
      const res = await request(app)
        .post("/api/payment/pay")
        .set("Authorization", bearer("1", "user"))
        .send({});
      expect(res.status).toBe(400);
    });

    it("returns 404 when the reservation does not exist", async () => {
      setupQueryStubs([
        { match: "FROM Reservation WHERE id", result: { rows: [] } },
        {
          match: "FROM Account WHERE email",
          result: { rows: [{ id: "1" }] },
        },
      ]);

      const res = await request(app)
        .post("/api/payment/pay")
        .set("Authorization", bearer("1", "user"))
        .send(validDebitBody);
      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Reservation not found");
    });

    it("returns 400 when the reservation is already confirmed (non-match)", async () => {
      setupQueryStubs([
        {
          match: "FROM Reservation WHERE id",
          result: {
            rows: [
              {
                id: "10",
                status: "confirmed",
                price: 800,
                is_match: false,
              },
            ],
          },
        },
        {
          match: "FROM Account WHERE email",
          result: { rows: [{ id: "1" }] },
        },
      ]);

      const res = await request(app)
        .post("/api/payment/pay")
        .set("Authorization", bearer("1", "user"))
        .send(validDebitBody);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already confirmed/);
    });

    it("creates a debit payment for a confirmed reservation", async () => {
      (mp.createPayment as jest.Mock).mockResolvedValue({ id: 99999 });

      setupQueryStubs([
        {
          match: "FROM Reservation WHERE id",
          result: {
            rows: [
              {
                id: "10",
                status: "pending",
                price: 800,
                is_match: false,
              },
            ],
          },
        },
        {
          match: "FROM Account WHERE email",
          result: { rows: [{ id: "1" }] },
        },
        // getPaymentByReservationAndAccount -> empty
        {
          match: "FROM Payment WHERE reservation_id",
          result: { rows: [] },
        },
        // createPaymentHistoryQuery
        {
          match: "INSERT INTO Payment",
          result: { rows: [{ id: "501" }] },
        },
        // updateReservationStatusQuery -> confirmed
        {
          match: "UPDATE Reservation SET status",
          result: { rows: [{ id: "10", status: "confirmed" }] },
        },
      ]);

      const res = await request(app)
        .post("/api/payment/pay")
        .set("Authorization", bearer("1", "user"))
        .send(validDebitBody);
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/Payment for reservation confirmed/);
      expect(mp.createPayment).toHaveBeenCalled();
    });
  });

  describe("POST /api/payment/cash", () => {
    it("creates a cash payment for a plain reservation", async () => {
      setupQueryStubs([
        {
          match: "FROM Reservation WHERE id",
          result: {
            rows: [{ id: "10", status: "pending", price: 800, is_match: false }],
          },
        },
        {
          match: "FROM Account WHERE id",
          result: { rows: [{ id: "1" }] },
        },
        // getPaymentByReservationAndAccount
        {
          match: "FROM Payment WHERE reservation_id",
          result: { rows: [] },
        },
        // createPaymentHistoryQuery
        {
          match: "INSERT INTO Payment",
          result: { rows: [{ id: "601" }] },
        },
        // updateReservationStatusQuery
        {
          match: "UPDATE Reservation SET status",
          result: { rows: [{ id: "10", status: "confirmed" }] },
        },
      ]);

      const res = await request(app)
        .post("/api/payment/cash")
        .set("Authorization", bearer("1", "user"))
        .send({ reservation_id: "10", account_id: "1" });
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/Payment for reservation confirmed/);
    });

    it("returns 404 when the reservation does not exist", async () => {
      setupQueryStubs([
        { match: "FROM Reservation WHERE id", result: { rows: [] } },
        { match: "FROM Account WHERE id", result: { rows: [{ id: "1" }] } },
      ]);
      const res = await request(app)
        .post("/api/payment/cash")
        .set("Authorization", bearer("1", "user"))
        .send({ reservation_id: "10", account_id: "1" });
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/payment/bank-transfer", () => {
    it("rejects when the proof file is missing in Cloudinary", async () => {
      (cloud.verifyCloudinaryFile as jest.Mock).mockResolvedValue(false);
      setupQueryStubs([
        {
          match: "FROM Reservation WHERE id",
          result: {
            rows: [{ id: "10", price: 800, is_match: false }],
          },
        },
        {
          match: "FROM Account WHERE id",
          result: { rows: [{ id: "1" }] },
        },
        // getPaymentByReservationAndAccount
        { match: "FROM Payment WHERE reservation_id", result: { rows: [] } },
      ]);

      const res = await request(app)
        .post("/api/payment/bank-transfer")
        .set("Authorization", bearer("1", "user"))
        .send({
          reservation_id: "10",
          account_id: "1",
          proof_url: "missing.png",
        });
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/File not found/i);
    });

    it("creates a pending bank-transfer payment", async () => {
      (cloud.verifyCloudinaryFile as jest.Mock).mockResolvedValue(true);
      setupQueryStubs([
        {
          match: "FROM Reservation WHERE id",
          result: {
            rows: [{ id: "10", price: 800, is_match: false }],
          },
        },
        { match: "FROM Account WHERE id", result: { rows: [{ id: "1" }] } },
        { match: "FROM Payment WHERE reservation_id", result: { rows: [] } },
        {
          match: "INSERT INTO Payment",
          result: {
            rows: [{ id: "701", payment_status: "pending" }],
          },
        },
      ]);

      const res = await request(app)
        .post("/api/payment/bank-transfer")
        .set("Authorization", bearer("1", "user"))
        .send({
          reservation_id: "10",
          account_id: "1",
          proof_url: "proof.png",
        });
      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ id: "701" });
    });
  });

  describe("POST /api/payment/bank-transfer/confirm", () => {
    it("is forbidden for regular users", async () => {
      const res = await request(app)
        .post("/api/payment/bank-transfer/confirm")
        .set("Authorization", bearer("1", "user"))
        .send({ payment_id: "1", status: "completed" });
      expect(res.status).toBe(403);
    });

    it("returns 404 when the payment doesn't exist", async () => {
      setupQueryStubs([
        { match: "FROM Payment WHERE id", result: { rows: [] } },
      ]);
      const res = await request(app)
        .post("/api/payment/bank-transfer/confirm")
        .set("Authorization", bearer("1", "admin"))
        .send({ payment_id: "1", status: "completed" });
      expect(res.status).toBe(404);
    });
  });
});
