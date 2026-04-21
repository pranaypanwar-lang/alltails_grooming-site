import { NextResponse } from "next/server";
import { assertAdminSession } from "../../_lib/assertAdmin";
import { adminPrisma, logAdminBookingEvent } from "../../_lib/bookingAdmin";
import { prepareCustomerMessageForBooking } from "../../../../../lib/customerMessaging/service";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set(["periodic_care_tip", "custom_offer"]);

export async function POST(request: Request) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const body = await request.json().catch(() => ({}));
    const messageType = typeof body.messageType === "string" ? body.messageType.trim() : "";
    const city = typeof body.city === "string" ? body.city.trim() : "";
    const customText = typeof body.customText === "string" ? body.customText.trim() : "";
    const offerCode = typeof body.offerCode === "string" ? body.offerCode.trim() : "";
    const limit = Math.max(1, Math.min(200, Number(body.limit) || 50));

    if (!ALLOWED_TYPES.has(messageType)) {
      return NextResponse.json({ error: "Invalid campaign message type" }, { status: 400 });
    }

    const completedBookings = await adminPrisma.booking.findMany({
      where: {
        status: "completed",
        ...(city ? { user: { city: { contains: city, mode: "insensitive" } } } : {}),
      },
      include: {
        user: true,
      },
      orderBy: { selectedDate: "desc" },
      take: 500,
    });

    const latestByUser = new Map<string, (typeof completedBookings)[number]>();
    for (const booking of completedBookings) {
      if (!latestByUser.has(booking.userId)) {
        latestByUser.set(booking.userId, booking);
      }
    }

    const audience = Array.from(latestByUser.values()).slice(0, limit);
    const results: Array<{ bookingId: string; created: boolean }> = [];

    for (const booking of audience) {
      const prepared = await prepareCustomerMessageForBooking(
        adminPrisma,
        booking.id,
        messageType as "periodic_care_tip" | "custom_offer",
        { customText: customText || null, offerCode: offerCode || null }
      );

      results.push({ bookingId: booking.id, created: prepared.created });

      if (prepared.created) {
        await logAdminBookingEvent({
          bookingId: booking.id,
          type: "customer_message_prepared",
          summary: `${messageType.replace(/_/g, " ")} campaign prepared for customer`,
          metadata: {
            messageType,
            channel: prepared.message.channel,
            recipient: prepared.message.recipient,
            city: booking.user.city,
            offerCode: offerCode || null,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      audienceCount: audience.length,
      preparedCount: results.filter((item) => item.created).length,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to prepare campaign" },
      { status: 500 }
    );
  }
}

