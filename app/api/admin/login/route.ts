import { NextResponse } from "next/server";
import {
  createAdminSessionToken,
  getAdminSessionCookieName,
  getAdminSessionMaxAge,
  isAdminAuthConfigured,
  validateAdminCredentials,
} from "../../../../lib/auth/adminSession";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isAdminAuthConfigured()) {
    return NextResponse.json({ error: "Admin authentication is not configured" }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
  }

  const valid = await validateAdminCredentials(username, password);
  if (!valid) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  const token = createAdminSessionToken(username);
  if (!token) {
    return NextResponse.json({ error: "Admin authentication is not configured" }, { status: 503 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(getAdminSessionCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getAdminSessionMaxAge(),
  });
  return response;
}
