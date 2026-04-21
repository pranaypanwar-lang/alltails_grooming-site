import { notFound } from "next/navigation";
import { adminPrisma } from "../../../api/admin/_lib/bookingAdmin";
import { verifyGroomerAccessToken } from "../../../../lib/groomerAccess";
import { getGroomerSessionMember } from "../../../../lib/auth/groomerSession";
import { fetchGroomerBooking, serializeGroomerBooking } from "../../../../lib/groomerPortal";
import { GroomerJobClient } from "./GroomerJobClient";

export const runtime = "nodejs";

export default async function GroomerJobPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;

  const verified = verifyGroomerAccessToken(token ?? null, id);
  const sessionMember = await getGroomerSessionMember();

  const booking = await fetchGroomerBooking(adminPrisma, id);
  if (!booking) {
    notFound();
  }

  const sessionAllowed =
    !!sessionMember &&
    (booking.groomerMemberId === sessionMember.id ||
      (!booking.groomerMemberId && booking.assignedTeamId === sessionMember.teamId));

  if (!verified && !sessionAllowed) {
    return (
      <div className="min-h-screen bg-[#f8f6ff] px-4 py-10">
        <div className="mx-auto max-w-md rounded-[28px] border border-[#ece5ff] bg-white p-6 shadow-[0_18px_48px_rgba(73,44,120,0.08)]">
          <h1 className="text-[24px] font-black tracking-[-0.03em] text-[#1f1f2c]">Link expired or invalid</h1>
          <p className="mt-3 text-[14px] leading-[1.7] text-[#6b7280]">
            This groomer action link is no longer valid. Please ask operations to resend the latest Telegram link.
          </p>
        </div>
      </div>
    );
  }

  return <GroomerJobClient initialBooking={await serializeGroomerBooking(adminPrisma, booking)} token={token} />;
}
