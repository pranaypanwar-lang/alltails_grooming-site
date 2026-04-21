import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  getExpiredPendingReleaseUpdate,
  hasPendingPaymentExpired,
  isValidCronBearerToken,
} from "../lib/booking/holdExpiry";

describe("hold expiry helpers", () => {
  test("validates cron bearer auth", () => {
    assert.deepEqual(isValidCronBearerToken(null, undefined), {
      ok: false,
      status: 503,
      error: "CRON_SECRET is not configured",
    });

    assert.deepEqual(isValidCronBearerToken("Bearer wrong", "cron-secret"), {
      ok: false,
      status: 401,
      error: "Unauthorized",
    });

    assert.deepEqual(isValidCronBearerToken("Bearer cron-secret", "cron-secret"), {
      ok: true,
    });
  });

  test("expires only unpaid pending prepaid bookings past their window", () => {
    const now = new Date("2026-04-20T10:00:00.000Z");

    assert.equal(
      hasPendingPaymentExpired(
        {
          paymentMethod: "pay_now",
          paymentStatus: "unpaid",
          status: "pending_payment",
          paymentExpiresAt: new Date("2026-04-20T09:59:59.000Z"),
        },
        now
      ),
      true
    );

    assert.equal(
      hasPendingPaymentExpired(
        {
          paymentMethod: "pay_now",
          paymentStatus: "paid",
          status: "confirmed",
          paymentExpiresAt: new Date("2026-04-20T09:59:59.000Z"),
        },
        now
      ),
      false
    );

    assert.equal(
      hasPendingPaymentExpired(
        {
          paymentMethod: "pay_after_service",
          paymentStatus: "unpaid",
          status: "pending_payment",
          paymentExpiresAt: new Date("2026-04-20T09:59:59.000Z"),
        },
        now
      ),
      false
    );
  });

  test("returns the expected release update payloads", () => {
    const now = new Date("2026-04-20T10:00:00.000Z");

    assert.deepEqual(getExpiredPendingReleaseUpdate(now), {
      bookingSlot: { status: "released" },
      slot: { isHeld: false, holdExpiresAt: null },
      booking: {
        status: "payment_expired",
        paymentExpiredAt: now,
        paymentPendingReason: "hold_expired",
      },
    });
  });
});
