import { NextRequest, NextResponse } from "next/server";
import { adminPrisma } from "../../../admin/_lib/bookingAdmin";
import { assertGroomerAccess } from "../../_lib/assertGroomerAccess";
import { fetchGroomerBooking, serializeGroomerBooking } from "../../../../../lib/groomerPortal";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const token = request.nextUrl.searchParams.get("token");
    const access = await assertGroomerAccess(bookingId, token);
    if (access.error) return access.error;

    const booking = await fetchGroomerBooking(adminPrisma, bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      booking: await serializeGroomerBooking(adminPrisma, booking),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load groomer booking" },
      { status: 500 }
    );
  }
}
