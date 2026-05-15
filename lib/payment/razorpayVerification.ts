import crypto from "crypto";

export function buildRazorpaySignaturePayload(orderId: string, paymentId: string) {
  return `${orderId}|${paymentId}`;
}

export function createExpectedRazorpaySignature(
  secret: string,
  orderId: string,
  paymentId: string
) {
  return crypto
    .createHmac("sha256", secret.trim())
    .update(buildRazorpaySignaturePayload(orderId, paymentId))
    .digest("hex");
}

export function hasValidRazorpaySignature(input: {
  secret: string;
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  return (
    createExpectedRazorpaySignature(input.secret, input.orderId, input.paymentId) ===
    input.signature
  );
}

export function validateBookingPaymentVerification(input: {
  bookingPhone: string;
  accessPhone: string;
  bookingOrderId: string | null;
  orderId: string;
  paymentExpiresAt: Date | null;
  now?: Date;
  bookingAccessMatchesPhone: (bookingPhone: string, accessPhone: string) => boolean;
}) {
  if (!input.bookingAccessMatchesPhone(input.bookingPhone, input.accessPhone)) {
    return {
      ok: false as const,
      status: 403,
      error: "Booking access does not match this booking",
    };
  }

  if (!input.bookingOrderId || input.bookingOrderId !== input.orderId) {
    return {
      ok: false as const,
      status: 409,
      error: "Payment order does not match this booking",
    };
  }

  // paymentExpiresAt is intentionally NOT a hard reject anymore. Bug surfaced
  // in production: customers who took an extra few seconds on the Razorpay
  // screen (so verify hit our server a moment past the 15-min hold) had
  // their card charged by Razorpay but our verify returned 409 — the slot
  // then sat unpaid and got cancelled. The Razorpay signature check above
  // already proves the payment is genuine; Razorpay enforces order-level
  // expiry on its own side, so a valid signature means a real captured
  // payment. We surface the late case so the caller can log/alert ops,
  // but never reject the customer's money.
  const now = input.now ?? new Date();
  const isLatePayment = !!(
    input.paymentExpiresAt && input.paymentExpiresAt < now
  );
  const holdExpiredBySeconds = isLatePayment && input.paymentExpiresAt
    ? Math.round((now.getTime() - input.paymentExpiresAt.getTime()) / 1000)
    : 0;

  return {
    ok: true as const,
    isLatePayment,
    holdExpiredBySeconds,
  };
}
