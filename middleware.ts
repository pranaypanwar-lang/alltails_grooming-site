import { NextRequest, NextResponse } from "next/server";

const ADMIN_SESSION_COOKIE = "petsie_admin_session";
const GROOMER_SESSION_COOKIE = "alltails_groomer_session";

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return atob(padded);
}

function encodeBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function timingSafeStringEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return result === 0;
}

async function signAdminPayload(payload: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return encodeBase64Url(new Uint8Array(signature));
}

async function hasValidAdminSession(request: NextRequest) {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (!secret) return false;

  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expectedSignature = await signAdminPayload(payload, secret);
  if (!timingSafeStringEqual(signature, expectedSignature)) {
    return false;
  }

  try {
    const parsed = JSON.parse(decodeBase64Url(payload)) as { exp?: number };
    return typeof parsed.exp === "number" && parsed.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

async function hasValidGroomerSession(request: NextRequest) {
  const secret = process.env.GROOMER_SESSION_SECRET?.trim() || process.env.ADMIN_SESSION_SECRET?.trim();
  if (!secret) return false;

  const token = request.cookies.get(GROOMER_SESSION_COOKIE)?.value;
  if (!token) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expectedSignature = await signAdminPayload(payload, secret);
  if (!timingSafeStringEqual(signature, expectedSignature)) return false;

  try {
    const parsed = JSON.parse(decodeBase64Url(payload)) as { exp?: number };
    return typeof parsed.exp === "number" && parsed.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const valid = await hasValidAdminSession(request);
    if (!valid) {
      return NextResponse.redirect(new URL("/admin-login", request.url));
    }
  }

  if (request.nextUrl.pathname === "/groomer" || request.nextUrl.pathname.startsWith("/groomer/home")) {
    const valid = await hasValidGroomerSession(request);
    if (!valid) {
      return NextResponse.redirect(new URL("/groomer-login", request.url));
    }
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/groomer", "/groomer/home/:path*", "/api/:path*"],
};
