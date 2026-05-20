import { NextRequest, NextResponse } from "next/server";
import { adminPrisma, logBookingEvent } from "../../../../admin/_lib/bookingAdmin";
import { assertGroomerAccess } from "../../../_lib/assertGroomerAccess";
import { finalizeBookingCompletion } from "../../../../../../lib/booking/finalizeBookingCompletion";

async function getNextBookingForGroomer(bookingId: string) {
  const booking = await adminPrisma.booking.findUnique({
    where: { id: bookingId },
    select: { groomerMemberId: true, selectedDate: true },
  });
  if (!booking?.groomerMemberId || !booking.selectedDate) return null;

  const next = await adminPrisma.booking.findFirst({
    where: {
      id: { not: bookingId },
      groomerMemberId: booking.groomerMemberId,
      selectedDate: booking.selectedDate,
      status: { in: ["confirmed", "pending"] },
    },
    orderBy: { createdAt: "asc" },
    include: {
      service: { select: { name: true } },
      pets: { include: { pet: { select: { name: true, breed: true } } }, take: 1 },
    },
  });
  if (!next) return null;

  // Parse a human-readable time label from bookingWindowId e.g. "team__2026-05-20__09:00__11:00"
  const windowLabel = (() => {
    const parts = (next.bookingWindowId ?? "").split("__");
    const start = parts[parts.length - 2];
    const end = parts[parts.length - 1];
    if (start && end && /^\d{2}:\d{2}$/.test(start)) return `${start}–${end}`;
    return null;
  })();

  return {
    id: next.id,
    serviceName: next.service.name,
    petName: next.pets[0]?.pet?.name ?? null,
    petBreed: next.pets[0]?.pet?.breed ?? null,
    windowLabel,
  };
}

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

    const nextBooking = await getNextBookingForGroomer(bookingId);

    return NextResponse.json({
      ...result,
      rewardsDelta: rewardResult?.rewardsDelta ?? [],
      rewardSummary: rewardResult?.rewardSummary ?? null,
      nextBooking,
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
