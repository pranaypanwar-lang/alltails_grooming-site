import { createBookingAccessToken, verifyBookingAccessToken } from "./auth/bookingAccess";

export function createGroomerAccessToken(bookingId: string, phone: string) {
  return createBookingAccessToken(bookingId, phone);
}

export function verifyGroomerAccessToken(token: string | null | undefined, bookingId: string) {
  return verifyBookingAccessToken(token, bookingId);
}

export function getGroomerJobUrl(params: {
  bookingId: string;
  phone: string;
  baseUrl?: string | null;
}) {
  const token = createGroomerAccessToken(params.bookingId, params.phone);
  if (!token) return null;

  const baseUrl = (params.baseUrl?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000").replace(/\/$/, "");
  return `${baseUrl}/groomer/jobs/${params.bookingId}?token=${encodeURIComponent(token)}`;
}
