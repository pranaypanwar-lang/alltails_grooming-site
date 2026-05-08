import { ENABLE_NEW_BOOKING_FLOW } from "../../lib/booking/featureFlags";
import NewMobileBookingFlow from "../components/booking/NewMobileBookingFlow";

export const metadata = {
  title: "Booking Flow Preview | All Tails",
  robots: {
    index: false,
    follow: false,
  },
};

export default function BookingPreviewPage() {
  const isLocalPreview = process.env.NODE_ENV !== "production";
  const enabled = ENABLE_NEW_BOOKING_FLOW || isLocalPreview;

  if (!enabled) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fcfbff] px-4 text-[#211c35]">
        <div className="max-w-md rounded-[24px] border border-[#e7def8] bg-white p-6 text-center shadow-[0_18px_50px_rgba(34,22,74,0.10)]">
          <h1 className="text-[24px] font-black tracking-[-0.03em]">Booking preview is disabled</h1>
          <p className="mt-3 text-[14px] leading-[1.65] text-[#667085]">
            Set NEXT_PUBLIC_ENABLE_NEW_BOOKING_FLOW=true to review this flow outside local development.
          </p>
        </div>
      </main>
    );
  }

  return <NewMobileBookingFlow />;
}
