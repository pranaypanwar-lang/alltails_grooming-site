import { NextResponse } from "next/server";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../../_lib/assertAdmin";
import { logAdminBookingEvent } from "../../../_lib/bookingAdmin";
import { finalizeBookingCompletion } from "../../../../../../lib/booking/finalizeBookingCompletion";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

type QaDecision = "in_progress" | "complete" | "issue";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const { id: bookingId } = await params;
    const body = await request.json().catch(() => ({}));
    const qaStatus: QaDecision =
      body?.qaStatus === "complete" || body?.qaStatus === "issue" ? body.qaStatus : "in_progress";
    const notes = typeof body?.notes === "string" ? body.notes.trim() : "";
    const completeBooking = body?.completeBooking === true;
    const allowMissingRequiredSteps = body?.allowMissingRequiredSteps === true;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true },
    });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    let completion: Awaited<ReturnType<typeof finalizeBookingCompletion>> | null = null;
    if (completeBooking) {
      completion = await finalizeBookingCompletion(prisma, bookingId, {
        allowMissingRequiredSteps,
        withholdRewards: allowMissingRequiredSteps,
      });

      for (const entry of completion.followUps) {
        if (!entry.created) continue;
        await logAdminBookingEvent({
          bookingId,
          type: "customer_message_prepared",
          summary: `${entry.messageType.replace(/_/g, " ")} queued for customer`,
          metadata: {
            messageType: entry.messageType,
            status: "queued",
          },
        });
      }
    }

    await logAdminBookingEvent({
      bookingId,
      type: "qa_review_updated",
      summary:
        qaStatus === "complete"
          ? completeBooking && allowMissingRequiredSteps
            ? "QA marked complete and booking force-completed without required proof"
            : "QA marked complete"
          : qaStatus === "issue"
            ? "QA issue flagged"
            : "QA marked in progress",
      metadata: {
        qaStatus,
        notes: notes || null,
        completedBooking: completeBooking,
        completedWithoutProof: completeBooking && allowMissingRequiredSteps,
      },
    });

    return NextResponse.json({
      success: true,
      bookingId,
      qaStatus,
      notes: notes || null,
      completion: completion
        ? {
            ...completion.result,
            rewardsDelta: completion.rewardResult?.rewardsDelta ?? [],
            rewardSummary: completion.rewardResult?.rewardSummary ?? null,
            rewardSuppressedReason: allowMissingRequiredSteps
              ? "XP withheld because booking was force-completed from QA without all required proof."
              : completion.rewardResult && "rewardSuppressedReason" in completion.rewardResult
                ? completion.rewardResult.rewardSuppressedReason
                : null,
          }
        : null,
    });
  } catch (error) {
    if (error instanceof Error && "httpStatus" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as Error & { httpStatus: number }).httpStatus }
      );
    }

    console.error("POST /api/admin/bookings/:id/qa-review failed", error);
    return NextResponse.json({ error: "Failed to update QA review" }, { status: 500 });
  }
}
