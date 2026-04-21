import { NextResponse } from "next/server";
import { adminPrisma, logAdminBookingEvent } from "../../_lib/bookingAdmin";
import { prepareCustomerMessageForBooking } from "../../../../../lib/customerMessaging/service";
import { processQueuedCustomerMessages } from "../../../../../lib/customerMessaging/provider";

export const runtime = "nodejs";

function getTomorrowDate() {
  return new Date(Date.now() + 86400000).toISOString().slice(0, 10);
}

function getStartOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const selectedDate = getTomorrowDate();
    const bookings = await adminPrisma.booking.findMany({
      where: {
        selectedDate,
        status: "confirmed",
      },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });

    const skipIfPreparedAfter = getStartOfToday();
    const results: Array<{ bookingId: string; created: boolean }> = [];

    for (const booking of bookings) {
      const result = await prepareCustomerMessageForBooking(
        adminPrisma,
        booking.id,
        "night_before_reminder",
        { skipIfPreparedAfter, deliveryStatus: "queued" }
      );
      results.push({ bookingId: booking.id, created: result.created });

      if (result.created) {
        await logAdminBookingEvent({
          bookingId: booking.id,
          type: "customer_message_prepared",
          summary: "Night-before reminder prepared for customer",
          metadata: {
            messageType: "night_before_reminder",
            channel: result.message.channel,
            recipient: result.message.recipient,
            status: result.message.status,
          },
        });
      }
    }

    const dispatchResult = await processQueuedCustomerMessages(adminPrisma, {
      limit: Math.max(10, bookings.length),
    });

    return NextResponse.json({
      date: selectedDate,
      totalBookings: bookings.length,
      preparedCount: results.filter((item) => item.created).length,
      skippedCount: results.filter((item) => !item.created).length,
      dispatchedCount: dispatchResult.acceptedCount,
      dispatchFailedCount: dispatchResult.failedCount,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to prepare night-before reminders" },
      { status: 500 }
    );
  }
}
