import { NextResponse } from "next/server";
import { assertAdminSession } from "../../../_lib/assertAdmin";
import { adminPrisma } from "../../../_lib/bookingAdmin";
import { getGroomerJobUrl } from "../../../../../../lib/groomerAccess";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  const { id: bookingId } = await params;

  const booking = await adminPrisma.booking.findUnique({
    where: { id: bookingId },
    include: { user: { select: { phone: true } } },
  });

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (!booking.user.phone) return NextResponse.json({ error: "No phone on user" }, { status: 400 });

  const phone = booking.user.phone.replace(/^\+91/, "");
  const url = getGroomerJobUrl({ bookingId, phone });

  if (!url) return NextResponse.json({ error: "Token secret not configured" }, { status: 500 });

  return NextResponse.json({ url });
}
