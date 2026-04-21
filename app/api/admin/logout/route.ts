import { NextResponse } from "next/server";
import { getAdminSessionCookieName } from "../../../../lib/auth/adminSession";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/admin-login", request.url));
  response.cookies.set(getAdminSessionCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
