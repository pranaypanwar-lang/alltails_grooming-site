import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../lib/generated/prisma";
import { assertBookingAccessToken, bookingAccessMatchesPhone } from "../_lib/assertBookingAccess";
import { completeBookingLifecycle } from "../../../../lib/booking/completeBookingLifecycle";

export const runtime = "nodejs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookingId, accessToken }: { bookingId?: string; accessToken?: string } = body;

    if (!bookingId?.trim()) {
      return NextResponse.json(
        { error: "Booking ID is required" },
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
      return NextResponse.json(
        { error: "Booking access does not match this booking" },
        { status: 403 }
      );
    }

    const result = await completeBookingLifecycle(prisma, bookingId);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && "httpStatus" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as Error & { httpStatus: number }).httpStatus }
      );
    }

    console.error("Complete booking API error:", error);
    return NextResponse.json(
      { error: "Failed to complete booking" },
      { status: 500 }
    );
  }
}
