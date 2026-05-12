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

const validBody = { reservation_id: "10", email: "a@b.com" };

describe("Payment router", () => {
  afterEach(() => {
    resetQueryStubs();
    (mp.createPreference as jest.Mock).mockReset();
    (mp.getPayment as jest.Mock).mockReset();
    (mp.verifyWebhookSignature as jest.Mock).mockReset();
    (mp.verifyWebhookSignature as jest.Mock).mockReturnValue(true);
    (mp.generateProofPayment as jest.Mock).mockReset();
    (cloud.verifyCloudinaryFile as jest.Mock).mockReset();
  });

  describe("POST /api/payment/pay (Checkout Pro preference)", () => {
    it("requires auth", async () => {
      const res = await request(app).post("/api/payment/pay").send(validBody);
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
        .send(validBody);
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
                reservation_date: "2025-01-01",
                start_time: "10:00",
                end_time: "11:00",
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
        .send(validBody);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already confirmed/);
    });

    it("creates a preference and returns init_point for a plain reservation", async () => {
      (mp.createPreference as jest.Mock).mockResolvedValue({
        id: "PREF-1",
        init_point: "https://mp/checkout/PREF-1",
      });

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
                reservation_date: "2025-01-01",
                start_time: "10:00",
                end_time: "11:00",
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
        // createPaymentHistoryQuery -> returns the new row id
        {
          match: "INSERT INTO Payment",
          result: { rows: [{ id: "501" }] },
        },
        // updatePaymentPreferenceQuery
        {
          match: "UPDATE Payment SET mp_preference_id",
          result: { rows: [] },
        },
      ]);

      const res = await request(app)
        .post("/api/payment/pay")
        .set("Authorization", bearer("1", "user"))
        .send(validBody);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        init_point: "https://mp/checkout/PREF-1",
        preference_id: "PREF-1",
        payment_id: "501",
      });
      expect(mp.createPreference).toHaveBeenCalledWith(
        expect.objectContaining({
          reservation_id: "10",
          amount: 800,
          payer_email: "a@b.com",
          external_reference: "501",
        })
      );
    });

    it("creates a preference for a match-type reservation", async () => {
      (mp.createPreference as jest.Mock).mockResolvedValue({
        id: "PREF-2",
        init_point: "https://mp/checkout/PREF-2",
      });

      setupQueryStubs([
        {
          match: "FROM Reservation WHERE id",
          result: {
            rows: [
              {
                id: "10",
                status: "pending",
                price: 800,
                is_match: true,
                reservation_date: "2025-01-01",
                start_time: "10:00",
                end_time: "11:00",
              },
            ],
          },
        },
        {
          match: "FROM Account WHERE email",
          result: { rows: [{ id: "1" }] },
        },
        // getMatchByReservationQuery
        {
          match: /FROM Match\s/i,
          result: {
            rows: [{ id: "20", status: "completed", price_per_player: 200 }],
          },
        },
        // getPlayerJoinedByMatchQuery
        {
          match: /FROM MatchPlayer/i,
          result: {
            rows: [
              {
                match_id: "20",
                player_id: "1",
                payment_method: "cash",
              },
            ],
          },
        },
        // getPaymentByReservationAndAccount -> empty
        {
          match: "FROM Payment WHERE reservation_id",
          result: { rows: [] },
        },
        // createPaymentHistoryQuery
        {
          match: "INSERT INTO Payment",
          result: { rows: [{ id: "601" }] },
        },
        // updatePaymentPreferenceQuery
        {
          match: "UPDATE Payment SET mp_preference_id",
          result: { rows: [] },
        },
      ]);

      const res = await request(app)
        .post("/api/payment/pay")
        .set("Authorization", bearer("1", "user"))
        .send(validBody);

      expect(res.status).toBe(200);
      expect(res.body.preference_id).toBe("PREF-2");
      expect(mp.createPreference).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 200 })
      );
    });
  });

  describe("POST /api/payment/webhook", () => {
    it("returns 401 when signature verification fails", async () => {
      (mp.verifyWebhookSignature as jest.Mock).mockReturnValue(false);

      const res = await request(app)
        .post("/api/payment/webhook")
        .set("x-signature", "ts=123,v1=deadbeef")
        .set("x-request-id", "req-1")
        .send({ type: "payment", data: { id: "999" } });

      expect(res.status).toBe(401);
    });

    it("acks non-payment events without DB writes", async () => {
      const res = await request(app)
        .post("/api/payment/webhook")
        .set("x-signature", "ts=123,v1=ok")
        .set("x-request-id", "req-1")
        .send({ type: "merchant_order", data: { id: "999" } });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ received: true });
      expect(mp.getPayment).not.toHaveBeenCalled();
    });

    it("marks payment completed and confirms reservation on approved", async () => {
      (mp.getPayment as jest.Mock).mockResolvedValue({
        id: 99999,
        status: "approved",
        status_detail: "accredited",
        external_reference: "501",
      });

      setupQueryStubs([
        // getPaymentByIdQuery (external_reference = local id)
        {
          match: "FROM Payment WHERE id",
          result: {
            rows: [
              {
                id: "501",
                payment_status: "pending",
                mp_payment_id: null,
                reservation_id: "10",
                paid_by: "1",
              },
            ],
          },
        },
        // updatePaymentAfterWebhookQuery
        {
          match: /UPDATE Payment\s+SET mp_payment_id/,
          result: { rows: [] },
        },
        // getReservationWithIdQuery
        {
          match: "FROM Reservation WHERE id",
          result: { rows: [{ id: "10", is_match: false }] },
        },
        // updateReservationStatusQuery
        {
          match: "UPDATE Reservation SET status",
          result: { rows: [{ id: "10", status: "confirmed" }] },
        },
      ]);

      const res = await request(app)
        .post("/api/payment/webhook")
        .set("x-signature", "ts=123,v1=ok")
        .set("x-request-id", "req-1")
        .send({ type: "payment", data: { id: "99999" } });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ received: true });
    });

    it("marks payment failed on rejected and does not touch reservation", async () => {
      (mp.getPayment as jest.Mock).mockResolvedValue({
        id: 99998,
        status: "rejected",
        status_detail: "cc_rejected",
        external_reference: "502",
      });

      setupQueryStubs([
        {
          match: "FROM Payment WHERE id",
          result: {
            rows: [
              {
                id: "502",
                payment_status: "pending",
                mp_payment_id: null,
                reservation_id: "11",
                paid_by: "1",
              },
            ],
          },
        },
        {
          match: /UPDATE Payment\s+SET mp_payment_id/,
          result: { rows: [] },
        },
      ]);

      const res = await request(app)
        .post("/api/payment/webhook")
        .set("x-signature", "ts=123,v1=ok")
        .set("x-request-id", "req-1")
        .send({ type: "payment", data: { id: "99998" } });

      expect(res.status).toBe(200);
    });

    it("is idempotent on retry when payment already completed", async () => {
      (mp.getPayment as jest.Mock).mockResolvedValue({
        id: 99999,
        status: "approved",
        status_detail: "accredited",
        external_reference: "501",
      });

      setupQueryStubs([
        {
          match: "FROM Payment WHERE id",
          result: {
            rows: [
              {
                id: "501",
                payment_status: "completed",
                mp_payment_id: "99999",
                reservation_id: "10",
                paid_by: "1",
              },
            ],
          },
        },
      ]);

      const res = await request(app)
        .post("/api/payment/webhook")
        .set("x-signature", "ts=123,v1=ok")
        .set("x-request-id", "req-1")
        .send({ type: "payment", data: { id: "99999" } });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ received: true });
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
