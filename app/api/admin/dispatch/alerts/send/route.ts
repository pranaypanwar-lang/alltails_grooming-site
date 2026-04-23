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
    const { bookingId, bookingIds, teamId, alertType = "manual_dispatch", messageOverride } = body as {
      bookingId?: string;
      bookingIds?: string[];
      teamId?: string;
      alertType?: string;
      messageOverride?: string;
    };

    const normalizedBookingIds = Array.isArray(bookingIds)
      ? [...new Set(bookingIds.filter((value): value is string => typeof value === "string" && value.trim().length > 0))]
      : [];
    const targetBookingIds =
      normalizedBookingIds.length > 0
        ? normalizedBookingIds
        : bookingId
          ? [bookingId]
          : [];

    if (!targetBookingIds.length) {
      return NextResponse.json({ error: "bookingId or bookingIds is required" }, { status: 400 });
    }

    const results: Array<{
      bookingId: string;
      success: boolean;
      teamId: string | null;
      teamName: string | null;
      telegramMessageId: string | null;
      error: string | null;
    }> = [];

    for (const targetBookingId of targetBookingIds) {
      try {
        const { team, success, telegramMessageId, errorMsg } = await sendBookingDispatchAlert({
          prisma,
          bookingId: targetBookingId,
          teamId,
          alertType,
          messageOverride,
          baseUrl: getPublicAppUrl(request),
        });

        await logAdminBookingEvent({
          bookingId: targetBookingId,
          type: "dispatch_alert_sent",
          summary: success
            ? `Dispatch alert sent to ${team.name}`
            : `Dispatch alert failed for ${team.name}`,
          metadata: {
            teamId: team.id,
            alertType,
            success,
            errorMsg: errorMsg ?? null,
          },
        });

        results.push({
          bookingId: targetBookingId,
          success,
          teamId: team.id,
          teamName: team.name,
          telegramMessageId: telegramMessageId ?? null,
          error: errorMsg ?? null,
        });
      } catch (error) {
        results.push({
          bookingId: targetBookingId,
          success: false,
          teamId: null,
          teamName: null,
          telegramMessageId: null,
          error: error instanceof Error ? error.message : "Failed to send alert",
        });
      }
    }

    const successCount = results.filter((result) => result.success).length;
    const failureCount = results.length - successCount;

    if (targetBookingIds.length === 1) {
      const [result] = results;
      if (!result.success) {
        return NextResponse.json({ error: result.error ?? "Failed to send alert" }, { status: 502 });
      }

      return NextResponse.json({
        success: true,
        telegramMessageId: result.telegramMessageId,
        result,
      });
    }

    return NextResponse.json({
      success: failureCount === 0,
      totalCount: results.length,
      successCount,
      failureCount,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send alert" },
      { status: 500 }
    );
  }
}
