import { NextResponse } from "next/server";
import { adminPrisma, logAdminBookingEvent } from "../../_lib/bookingAdmin";
import { prepareCustomerMessageForBooking } from "../../../../../lib/customerMessaging/service";

export const runtime = "nodejs";

function getIsoDateDaysAgo(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
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
    const targetDate = getIsoDateDaysAgo(35);
    const today = getTodayDate();
    const completedBookings = await adminPrisma.booking.findMany({
      where: {
        status: "completed",
        selectedDate: targetDate,
      },
      include: {
        user: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const skipIfPreparedAfter = getStartOfToday();
    const results: Array<{ bookingId: string; created: boolean; skippedReason?: string }> = [];

    for (const booking of completedBookings) {
      const hasUpcomingBooking = await adminPrisma.booking.findFirst({
        where: {
          userId: booking.userId,
          selectedDate: { gte: today },
          status: { in: ["pending_payment", "confirmed"] },
        },
        select: { id: true },
      });

      if (hasUpcomingBooking) {
        results.push({ bookingId: booking.id, created: false, skippedReason: "upcoming_booking_exists" });
        continue;
      }

      const prepared = await prepareCustomerMessageForBooking(
        adminPrisma,
        booking.id,
        "rebooking_reminder",
        { skipIfPreparedAfter, deliveryStatus: "queued" }
      );

      results.push({ bookingId: booking.id, created: prepared.created });

      if (prepared.created) {
        await logAdminBookingEvent({
          bookingId: booking.id,
          type: "customer_message_prepared",
          summary: "5th-week rebooking reminder prepared for customer",
          metadata: {
            messageType: "rebooking_reminder",
            channel: prepared.message.channel,
            recipient: prepared.message.recipient,
            status: prepared.message.status,
          },
        });
      }
    }

    return NextResponse.json({
      targetDate,
      totalBookings: completedBookings.length,
      preparedCount: results.filter((item) => item.created).length,
      skippedCount: results.filter((item) => !item.created).length,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to prepare rebooking reminders" },
      { status: 500 }
    );
  }
}
