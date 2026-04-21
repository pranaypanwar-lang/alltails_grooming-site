import { createHmac, timingSafeEqual } from "crypto";

const BOOKING_ACCESS_TOKEN_TTL_SECS = 60 * 60 * 24 * 30;

type BookingAccessPayload = {
  bookingId: string;
  phone: string;
  exp: number;
};

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getBookingAccessSecret() {
  return process.env.BOOKING_ACCESS_TOKEN_SECRET?.trim() || process.env.ADMIN_SESSION_SECRET?.trim() || null;
}

function sign(payload: string) {
  const secret = getBookingAccessSecret();
  if (!secret) return null;
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqualString(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return timingSafeEqual(aBuffer, bBuffer);
}

export function canIssueBookingAccessTokens() {
  return !!getBookingAccessSecret();
}

export function createBookingAccessToken(bookingId: string, phone: string) {
  const now = Math.floor(Date.now() / 1000);
  const payload = encode(JSON.stringify({
    bookingId,
    phone,
    exp: now + BOOKING_ACCESS_TOKEN_TTL_SECS,
  } satisfies BookingAccessPayload));
  const signature = sign(payload);
  if (!signature) return null;
  return `${payload}.${signature}`;
}

export function verifyBookingAccessToken(token: string | undefined | null, bookingId: string) {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expectedSignature = sign(payload);
  if (!expectedSignature || !safeEqualString(signature, expectedSignature)) {
    return null;
  }

  try {
    const parsed = JSON.parse(decode(payload)) as BookingAccessPayload;
    if (!parsed.bookingId || !parsed.phone || !parsed.exp) return null;
    if (parsed.bookingId !== bookingId) return null;
    if (parsed.exp <= Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}
