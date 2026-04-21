import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../lib/generated/prisma";
import { assertBookingAccessToken, bookingAccessMatchesPhone } from "../../../booking/_lib/assertBookingAccess";

export const runtime = "nodejs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      bookingId,
      accessToken,
      reason,
      gatewayError,
    }: {
      bookingId?: string;
      accessToken?: string;
      reason?: string;
      gatewayError?: string | null;
    } = body;

    if (!bookingId?.trim()) {
      return NextResponse.json(
        { error: "bookingId is required" },
        { status: 400 }
      );
    }

    const access = assertBookingAccessToken(bookingId, accessToken);
    if (access instanceof NextResponse) {
      return access;
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { user: true },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    if (!bookingAccessMatchesPhone(booking.user.phone, access.phone)) {
      return NextResponse.json({ error: "Booking access does not match this booking" }, { status: 403 });
    }

    if (booking.status === "confirmed" || booking.paymentStatus === "paid") {
      return NextResponse.json({
        success: true,
        bookingId: booking.id,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
      });
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "pending_payment",
        paymentStatus: "unpaid",
        paymentPendingReason: reason?.trim() || null,
        paymentGatewayError: gatewayError?.trim() || null,
        paymentFailedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      bookingId: updated.id,
      status: updated.status,
      paymentStatus: updated.paymentStatus,
      paymentExpiresAt: updated.paymentExpiresAt,
    });
  } catch (error) {
    console.error("Mark pending payment API error:", error);
    return NextResponse.json(
      { error: "Failed to mark booking pending payment" },
      { status: 500 }
    );
  }
}
