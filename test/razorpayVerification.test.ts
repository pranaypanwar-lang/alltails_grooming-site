import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  buildRazorpaySignaturePayload,
  createExpectedRazorpaySignature,
  hasValidRazorpaySignature,
  validateBookingPaymentVerification,
} from "../lib/payment/razorpayVerification";

describe("Razorpay verification helpers", () => {
  test("builds and verifies Razorpay signatures", () => {
    const secret = "razorpay_secret";
    const orderId = "order_abc";
    const paymentId = "pay_xyz";

    assert.equal(
      buildRazorpaySignaturePayload(orderId, paymentId),
      "order_abc|pay_xyz"
    );

    const signature = createExpectedRazorpaySignature(secret, orderId, paymentId);
    assert.equal(
      hasValidRazorpaySignature({
        secret,
        orderId,
        paymentId,
        signature,
      }),
      true
    );

    assert.equal(
      hasValidRazorpaySignature({
        secret,
        orderId,
        paymentId,
        signature: "bad-signature",
      }),
      false
    );
  });

  test("validates booking-specific payment verification guards", () => {
    const matchesPhone = (bookingPhone: string, accessPhone: string) =>
      bookingPhone.replace(/\D/g, "").slice(-10) === accessPhone.replace(/\D/g, "").slice(-10);

    assert.deepEqual(
      validateBookingPaymentVerification({
        bookingPhone: "9999999999",
        accessPhone: "8888888888",
        bookingOrderId: "order_abc",
        orderId: "order_abc",
        paymentExpiresAt: null,
        bookingAccessMatchesPhone: matchesPhone,
      }),
      {
        ok: false,
        status: 403,
        error: "Booking access does not match this booking",
      }
    );

    assert.deepEqual(
      validateBookingPaymentVerification({
        bookingPhone: "9999999999",
        accessPhone: "9999999999",
        bookingOrderId: "order_abc",
        orderId: "order_abc",
        paymentExpiresAt: new Date("2026-04-20T09:00:00.000Z"),
        now: new Date("2026-04-20T10:00:00.000Z"),
        bookingAccessMatchesPhone: matchesPhone,
      }),
      {
        ok: false,
        status: 409,
        error: "Payment window has expired",
      }
    );

    assert.deepEqual(
      validateBookingPaymentVerification({
        bookingPhone: "9999999999",
        accessPhone: "9999999999",
        bookingOrderId: "order_expected",
        orderId: "order_actual",
        paymentExpiresAt: null,
        bookingAccessMatchesPhone: matchesPhone,
      }),
      {
        ok: false,
        status: 409,
        error: "Payment order does not match this booking",
      }
    );

    assert.deepEqual(
      validateBookingPaymentVerification({
        bookingPhone: "9999999999",
        accessPhone: "+91 99999 99999",
        bookingOrderId: "order_abc",
        orderId: "order_abc",
        paymentExpiresAt: new Date("2026-04-20T11:00:00.000Z"),
        now: new Date("2026-04-20T10:00:00.000Z"),
        bookingAccessMatchesPhone: matchesPhone,
      }),
      { ok: true }
    );
  });
});
