import { NextResponse } from "next/server";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../lib/generated/prisma";
import { assertBookingAccessToken, bookingAccessMatchesPhone } from "../_lib/assertBookingAccess";
import { getBookingWindowDisplay } from "../../../../lib/booking/window";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const bookingId = typeof body.bookingId === "string" ? body.bookingId.trim() : "";
    const accessToken = typeof body.accessToken === "string" ? body.accessToken : "";

    if (!bookingId || !accessToken) {
      return NextResponse.json({ error: "bookingId and accessToken are required" }, { status: 400 });
    }

    const access = assertBookingAccessToken(bookingId, accessToken);
    if (access instanceof NextResponse) return access;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: true,
        service: true,
        slots: { include: { slot: true }, orderBy: { slot: { startTime: "asc" } } },
      },
    });

    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (!bookingAccessMatchesPhone(booking.user.phone, access.phone)) {
      return NextResponse.json({ error: "Booking access does not match this booking" }, { status: 403 });
    }

    const bookingWindowDisplay = getBookingWindowDisplay({
      bookingWindowId: booking.bookingWindowId,
      selectedDate: booking.selectedDate,
      slots: booking.slots.map((item) => item.slot),
    });

    return NextResponse.json({
      booking: {
        id: booking.id,
        customerName: booking.user.name,
        serviceName: booking.service.name,
        selectedDate: booking.selectedDate,
        displayLabel: bookingWindowDisplay?.displayLabel ?? null,
        paymentMethod: booking.paymentMethod,
        paymentStatus: booking.paymentStatus,
        finalAmount: booking.finalAmount,
        paymentExpiresAt: booking.paymentExpiresAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    console.error("POST /api/booking/access failed", error);
    return NextResponse.json({ error: "Failed to load booking access" }, { status: 500 });
  }
}
