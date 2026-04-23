import { NextRequest, NextResponse } from "next/server";
import { adminPrisma, logBookingEvent } from "../../../../admin/_lib/bookingAdmin";
import { assertGroomerAccess } from "../../../_lib/assertGroomerAccess";
import { finalizeBookingCompletion } from "../../../../../../lib/booking/finalizeBookingCompletion";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const token = request.nextUrl.searchParams.get("token");
    const access = await assertGroomerAccess(bookingId, token);
    if (access.error) return access.error;

    const { result, rewardResult, followUps } = await finalizeBookingCompletion(adminPrisma, bookingId);

    await logBookingEvent({
      bookingId: result.bookingId,
      actor: "groomer",
      type: "booking_completed",
      summary: "Booking marked completed from groomer portal",
      metadata: {
        loyaltyCounted: result.loyalty.counted,
        source: "groomer_portal",
      },
    });
    for (const entry of followUps) {
      if (!entry.created) continue;
      await logBookingEvent({
        bookingId: result.bookingId,
        actor: "system",
        type: "customer_message_prepared",
        summary: `${entry.messageType.replace(/_/g, " ")} queued for customer`,
        metadata: {
          messageType: entry.messageType,
          status: "queued",
          source: "groomer_portal",
        },
      });
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to complete booking" },
      { status: 500 }
    );
  }
}
