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

  if (input.paymentExpiresAt && input.paymentExpiresAt < (input.now ?? new Date())) {
    return {
      ok: false as const,
      status: 409,
      error: "Payment window has expired",
    };
  }

  if (!input.bookingOrderId || input.bookingOrderId !== input.orderId) {
    return {
      ok: false as const,
      status: 409,
      error: "Payment order does not match this booking",
    };
  }

  return { ok: true as const };
}
