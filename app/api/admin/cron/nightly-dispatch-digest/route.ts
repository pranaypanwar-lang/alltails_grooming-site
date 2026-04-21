import { NextResponse } from "next/server";
import { runDigestSend } from "../../dispatch/digest/send/route";

export const runtime = "nodejs";

export async function GET(request: Request) {
  // Vercel Cron calls this with the Authorization header
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Send digest for tomorrow
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  return runDigestSend(tomorrow);
}
