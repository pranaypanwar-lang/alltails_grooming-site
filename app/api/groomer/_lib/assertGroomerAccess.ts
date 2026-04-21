import { NextResponse } from "next/server";
import { verifyGroomerAccessToken } from "../../../../lib/groomerAccess";
import { getGroomerSessionMember } from "../../../../lib/auth/groomerSession";
import { adminPrisma } from "../../admin/_lib/bookingAdmin";

export async function assertGroomerAccess(bookingId: string, token: string | null | undefined) {
  const verified = verifyGroomerAccessToken(token, bookingId);
  if (verified) {
    return {
      error: null,
      payload: verified,
    };
  }

  const sessionMember = await getGroomerSessionMember();
  if (!sessionMember) {
    return {
      error: NextResponse.json({ error: "Unauthorized groomer access" }, { status: 401 }),
      payload: null,
    };
  }

  const booking = await adminPrisma.booking.findUnique({
    where: { id: bookingId },
    select: { groomerMemberId: true, assignedTeamId: true },
  });

  if (!booking) {
    return {
      error: NextResponse.json({ error: "Booking not found" }, { status: 404 }),
      payload: null,
    };
  }

  const sessionAllowed =
    booking.groomerMemberId === sessionMember.id ||
    (!booking.groomerMemberId && booking.assignedTeamId === sessionMember.teamId);

  if (!sessionAllowed) {
    return {
      error: NextResponse.json({ error: "Unauthorized groomer access" }, { status: 403 }),
      payload: null,
    };
  }

  return {
    error: null,
    payload: {
      bookingId,
      phone: sessionMember.phone ?? "",
      exp: Math.floor(Date.now() / 1000) + 60,
    },
  };
}
