export type PendingPaymentBookingState = {
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  paymentExpiresAt: Date | null;
};

export function isValidCronBearerToken(
  authHeader: string | null,
  cronSecret: string | undefined | null
) {
  if (!cronSecret) {
    return { ok: false as const, status: 503, error: "CRON_SECRET is not configured" };
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }

  return { ok: true as const };
}

export function hasPendingPaymentExpired(
  booking: PendingPaymentBookingState,
  now: Date = new Date()
) {
  return (
    booking.paymentMethod === "pay_now" &&
    booking.paymentStatus === "unpaid" &&
    booking.status === "pending_payment" &&
    booking.paymentExpiresAt instanceof Date &&
    booking.paymentExpiresAt < now
  );
}

export function getExpiredPendingReleaseUpdate(now: Date) {
  return {
    bookingSlot: { status: "released" as const },
    slot: { isHeld: false, holdExpiresAt: null },
    booking: {
      status: "payment_expired" as const,
      dispatchState: "issue" as const,
      paymentExpiredAt: now,
      paymentPendingReason: "hold_expired",
    },
  };
}
