import { PaymentLinkClient } from "./PaymentLinkClient";

export default async function PaymentLinkPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="min-h-screen bg-[#f7f7fb] px-4 py-10">
        <div className="mx-auto max-w-[520px] rounded-[28px] border border-[#f3d6d6] bg-white p-6 text-[14px] text-[#b42318] shadow-[0_18px_48px_rgba(73,44,120,0.08)]">
          This payment link is incomplete. Please ask the All Tails team to share it again.
        </div>
      </div>
    );
  }

  return <PaymentLinkClient bookingId={id} accessToken={token} />;
}
