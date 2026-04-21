import { notFound } from "next/navigation";
import { adminPrisma } from "../../../api/admin/_lib/bookingAdmin";
import { assertGroomerMemberAccess } from "../../../api/groomer/_lib/assertGroomerMemberAccess";
import { serializeGroomerHome } from "../../../../lib/groomerHome";
import { GroomerHomeClient } from "./GroomerHomeClient";

export const runtime = "nodejs";

export default async function GroomerHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ memberId: string }>;
  searchParams: Promise<{ token?: string; bookingId?: string }>;
}) {
  const { memberId } = await params;
  const { token, bookingId } = await searchParams;

  if (!bookingId) {
    notFound();
  }

  const access = await assertGroomerMemberAccess({
    bookingId,
    memberId,
    token: token ?? null,
  });

  if (access.error) {
    return (
      <div className="min-h-screen bg-[#f8f6ff] px-4 py-10">
        <div className="mx-auto max-w-md rounded-[28px] border border-[#ece5ff] bg-white p-6 shadow-[0_18px_48px_rgba(73,44,120,0.08)]">
          <h1 className="text-[24px] font-black tracking-[-0.03em] text-[#1f1f2c]">Link expired or invalid</h1>
          <p className="mt-3 text-[14px] leading-[1.7] text-[#6b7280]">
            This groomer home link is no longer valid. Please ask operations to resend the latest Telegram link.
          </p>
        </div>
      </div>
    );
  }

  const home = await serializeGroomerHome(adminPrisma, memberId);
  if (!home) notFound();

  return <GroomerHomeClient initialHome={home} token={token!} bookingId={bookingId} />;
}
