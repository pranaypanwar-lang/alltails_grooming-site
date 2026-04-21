import { cookies } from "next/headers";
import { createHmac, timingSafeEqual, scryptSync } from "crypto";

const ADMIN_SESSION_COOKIE = "petsie_admin_session";
const ADMIN_SESSION_TTL_SECS = 60 * 60 * 12;

type AdminSessionPayload = {
  sub: string;
  exp: number;
};

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getAdminSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET?.trim() || null;
}

function getAdminUsername() {
  return process.env.ADMIN_USERNAME?.trim() || null;
}

function sign(payload: string) {
  const secret = getAdminSessionSecret();
  if (!secret) return null;
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqualString(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return timingSafeEqual(aBuffer, bBuffer);
}

function verifyScryptPassword(password: string, storedHash: string) {
  const [salt, expectedHex] = storedHash.split(":");
  if (!salt || !expectedHex) return false;
  const derived = scryptSync(password, salt, Buffer.from(expectedHex, "hex").length);
  const expected = Buffer.from(expectedHex, "hex");
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

export function isAdminAuthConfigured() {
  return !!getAdminSessionSecret() && !!getAdminUsername() && !!(process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD);
}

export async function validateAdminCredentials(username: string, password: string) {
  const expectedUsername = getAdminUsername();
  if (!expectedUsername || !safeEqualString(username.trim(), expectedUsername)) {
    return false;
  }

  const passwordHash = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (passwordHash) {
    return verifyScryptPassword(password, passwordHash);
  }

  const plainPassword = process.env.ADMIN_PASSWORD?.trim();
  if (!plainPassword) return false;
  return safeEqualString(password, plainPassword);
}

export function createAdminSessionToken(username: string) {
  const now = Math.floor(Date.now() / 1000);
  const payload = encode(JSON.stringify({ sub: username, exp: now + ADMIN_SESSION_TTL_SECS } satisfies AdminSessionPayload));
  const signature = sign(payload);
  if (!signature) return null;
  return `${payload}.${signature}`;
}

export function verifyAdminSessionToken(token: string | undefined | null) {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expectedSignature = sign(payload);
  if (!expectedSignature || !safeEqualString(signature, expectedSignature)) {
    return null;
  }

  try {
    const parsed = JSON.parse(decode(payload)) as AdminSessionPayload;
    if (!parsed.sub || !parsed.exp) return null;
    if (parsed.exp <= Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function hasAdminSession() {
  const jar = await cookies();
  const token = jar.get(ADMIN_SESSION_COOKIE)?.value;
  return !!verifyAdminSessionToken(token);
}

export function getAdminSessionCookieName() {
  return ADMIN_SESSION_COOKIE;
}

export function getAdminSessionMaxAge() {
  return ADMIN_SESSION_TTL_SECS;
}
