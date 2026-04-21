import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../../_lib/assertAdmin";
import { logAdminBookingEvent } from "../../../_lib/bookingAdmin";
import { completeBookingLifecycle } from "../../../../../../lib/booking/completeBookingLifecycle";
import { queuePostCompletionCustomerJourney } from "../../../../../../lib/customerMessaging/automation";
import { processQueuedCustomerMessages } from "../../../../../../lib/customerMessaging/provider";
import { awardCompletionRewards } from "../../../../../../lib/groomerRewards";

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
    const { id: bookingId } = await params;
    const result = await completeBookingLifecycle(prisma, bookingId);

    await logAdminBookingEvent({
      bookingId: result.bookingId,
      type: "booking_completed",
      summary: "Booking marked completed",
      metadata: {
        loyaltyCounted: result.loyalty.counted,
      },
    });

    let rewardResult = null;
    if (!result.alreadyCompleted) {
      rewardResult = await awardCompletionRewards(prisma, result.bookingId);
      const followUps = await queuePostCompletionCustomerJourney(prisma, result.bookingId);
      await processQueuedCustomerMessages(prisma, { limit: 10 });
      for (const entry of followUps) {
        if (!entry.created) continue;
        await logAdminBookingEvent({
          bookingId: result.bookingId,
          type: "customer_message_prepared",
          summary: `${entry.messageType.replace(/_/g, " ")} queued for customer`,
          metadata: {
            messageType: entry.messageType,
            status: "queued",
          },
        });
      }
    }

    return NextResponse.json({
      ...result,
      rewardsDelta: rewardResult?.rewardsDelta ?? [],
      rewardSummary: rewardResult?.rewardSummary ?? null,
    });
  } catch (error) {
    if (error instanceof Error && "httpStatus" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as Error & { httpStatus: number }).httpStatus }
      );
    }
    console.error("POST /api/admin/bookings/:id/complete failed", error);
    return NextResponse.json({ error: "Failed to complete booking" }, { status: 500 });
  }
}
