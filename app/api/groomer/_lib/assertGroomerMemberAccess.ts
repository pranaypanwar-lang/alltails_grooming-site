import { NextResponse } from "next/server";
import { adminPrisma } from "../../admin/_lib/bookingAdmin";
import { verifyGroomerAccessToken } from "../../../../lib/groomerAccess";

export async function assertGroomerMemberAccess(input: {
  bookingId: string;
  memberId: string;
  token: string | null | undefined;
}) {
  const verified = verifyGroomerAccessToken(input.token, input.bookingId);
  if (!verified) {
    return {
      error: NextResponse.json({ error: "Link expired or invalid" }, { status: 401 }),
      booking: null,
      member: null,
    };
  }

  const booking = await adminPrisma.booking.findUnique({
    where: { id: input.bookingId },
    include: {
      groomerMember: true,
      assignedTeam: true,
    },
  });

  if (!booking) {
    return {
      error: NextResponse.json({ error: "Booking not found" }, { status: 404 }),
      booking: null,
      member: null,
    };
  }

  if (booking.groomerMemberId !== input.memberId) {
    return {
      error: NextResponse.json({ error: "Groomer session not linked to this booking yet" }, { status: 403 }),
      booking: null,
      member: null,
    };
  }

  if (!booking.groomerMember) {
    return {
      error: NextResponse.json({ error: "Groomer not found" }, { status: 404 }),
      booking: null,
      member: null,
    };
  }

  return {
    error: null,
    booking,
    member: booking.groomerMember,
  };
}
