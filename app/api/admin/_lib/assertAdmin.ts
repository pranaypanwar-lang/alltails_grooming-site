import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isAdminAuthConfigured, verifyAdminSessionToken, getAdminSessionCookieName } from "../../../../lib/auth/adminSession";

export async function assertAdminSession(): Promise<NextResponse | null> {
  if (!isAdminAuthConfigured()) {
    return NextResponse.json({ error: "Admin authentication is not configured" }, { status: 503 });
  }

  const jar = await cookies();
  const token = jar.get(getAdminSessionCookieName())?.value;
  if (!verifyAdminSessionToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
