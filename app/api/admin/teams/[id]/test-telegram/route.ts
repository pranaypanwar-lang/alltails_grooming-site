import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../../_lib/assertAdmin";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const message: string = body.message ?? "🐾 All Tails test message — Telegram integration is working!";

    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
    if (!team.telegramChatId) return NextResponse.json({ error: "No Telegram chat ID configured for this team" }, { status: 400 });
    if (!team.telegramAlertsEnabled) return NextResponse.json({ error: "Telegram alerts are disabled for this team" }, { status: 400 });

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not configured" }, { status: 500 });

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: team.telegramChatId, text: message }),
    });

    const data = await res.json();
    if (!data.ok) {
      return NextResponse.json({ error: data.description ?? "Telegram send failed" }, { status: 502 });
    }

    return NextResponse.json({ success: true, telegramMessageId: String(data.result?.message_id) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
