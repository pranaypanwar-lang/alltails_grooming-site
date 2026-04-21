import { NextResponse } from "next/server";
import { verifyBookingAccessToken } from "../../../../lib/auth/bookingAccess";

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "").slice(-10);
}

export function assertBookingAccessToken(bookingId: string, accessToken: string | undefined | null) {
  const payload = verifyBookingAccessToken(accessToken, bookingId);
  if (!payload) {
    return NextResponse.json({ error: "Booking access is invalid or expired" }, { status: 401 });
  }
  return payload;
}

export function bookingAccessMatchesPhone(phone: string, tokenPhone: string) {
  return normalizePhone(phone) === normalizePhone(tokenPhone);
}
