import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { NextResponse } from "next/server";
import {
  createBookingAccessToken,
  verifyBookingAccessToken,
} from "../lib/auth/bookingAccess";
import {
  assertBookingAccessToken,
  bookingAccessMatchesPhone,
} from "../app/api/booking/_lib/assertBookingAccess";

const ORIGINAL_ENV = {
  BOOKING_ACCESS_TOKEN_SECRET: process.env.BOOKING_ACCESS_TOKEN_SECRET,
  ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET,
};

const REAL_DATE_NOW = Date.now;

describe("booking access tokens", () => {
  beforeEach(() => {
    process.env.BOOKING_ACCESS_TOKEN_SECRET = "booking-secret";
    process.env.ADMIN_SESSION_SECRET = "admin-fallback-secret";
    Date.now = () => 1_700_000_000_000;
  });

  afterEach(() => {
    process.env.BOOKING_ACCESS_TOKEN_SECRET = ORIGINAL_ENV.BOOKING_ACCESS_TOKEN_SECRET;
    process.env.ADMIN_SESSION_SECRET = ORIGINAL_ENV.ADMIN_SESSION_SECRET;
    Date.now = REAL_DATE_NOW;
  });

  test("creates and verifies booking-scoped access tokens", () => {
    const token = createBookingAccessToken("booking_123", "+91 98765 43210");
    assert.ok(token);

    assert.deepEqual(verifyBookingAccessToken(token, "booking_123"), {
      bookingId: "booking_123",
      phone: "+91 98765 43210",
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
    });

    assert.equal(verifyBookingAccessToken(token, "booking_999"), null);
  });

  test("rejects expired access tokens and mismatched phone access", async () => {
    const token = createBookingAccessToken("booking_123", "9876543210");
    assert.ok(token);

    assert.equal(bookingAccessMatchesPhone("+91 98765-43210", "9876543210"), true);
    assert.equal(bookingAccessMatchesPhone("9999999999", "9876543210"), false);

    Date.now = () => REAL_DATE_NOW() + 1000 * 60 * 60 * 24 * 31;

    const result = assertBookingAccessToken("booking_123", token);
    assert.ok(result instanceof NextResponse);
    assert.equal(result.status, 401);
    assert.deepEqual(await result.json(), {
      error: "Booking access is invalid or expired",
    });
  });
});
