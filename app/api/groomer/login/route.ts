import { NextResponse } from "next/server";
import {
  createGroomerSessionToken,
  getGroomerSessionCookieName,
  getGroomerSessionMaxAge,
  validateGroomerCredentials,
} from "../../../../lib/auth/groomerSession";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!phone || !password) {
    return NextResponse.json({ error: "Phone and password are required" }, { status: 400 });
  }

  const member = await validateGroomerCredentials(phone, password);
  if (!member) {
    return NextResponse.json({ error: "Invalid phone or password" }, { status: 401 });
  }

  const token = createGroomerSessionToken(member.id);
  if (!token) {
    return NextResponse.json({ error: "Groomer authentication is not configured" }, { status: 503 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(getGroomerSessionCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getGroomerSessionMaxAge(),
  });
  return response;
}
