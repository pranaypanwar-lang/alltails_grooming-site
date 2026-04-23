import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../../_lib/assertAdmin";
import { getPublicAppUrl, logAdminBookingEvent } from "../../../_lib/bookingAdmin";
import { sendBookingDispatchAlert } from "../../../../../../lib/telegram/dispatchAlerts";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

export async function POST(request: Request) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;
  try {
    const body = await request.json().catch(() => ({}));
    const { bookingId, teamId, alertType = "manual", messageOverride } = body as {
      bookingId?: string;
      teamId?: string;
      alertType?: string;
      messageOverride?: string;
    };

    if (!bookingId) {
      return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
    }

    const { team, success, telegramMessageId, errorMsg } = await sendBookingDispatchAlert({
      prisma,
      bookingId,
      teamId,
      alertType,
      messageOverride,
      baseUrl: getPublicAppUrl(request),
    });

    await logAdminBookingEvent({
      bookingId,
      type: "dispatch_alert_sent",
      summary: success ? `Dispatch alert sent to ${team.name}` : `Dispatch alert failed for ${team.name}`,
      metadata: {
        teamId: team.id,
        alertType,
        success,
        errorMsg: errorMsg ?? null,
      },
    });

    if (!success) {
      return NextResponse.json({ error: errorMsg ?? "Failed to send alert" }, { status: 502 });
    }

    return NextResponse.json({ success: true, telegramMessageId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send alert" },
      { status: 500 }
    );
  }
}
