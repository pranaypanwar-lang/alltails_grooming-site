"use client";

import { useCallback, useEffect, useState } from "react";

type BookingAccessResponse = {
  booking: {
    id: string;
    customerName: string;
    serviceName: string;
    selectedDate: string | null;
    displayLabel: string | null;
    paymentMethod: string | null;
    paymentStatus: string;
    finalAmount: number;
    paymentExpiresAt: string | null;
  };
};

type Props = {
  bookingId: string;
  accessToken: string;
};

type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayFailure = {
  error?: { description?: string | null } | null;
};

type RazorpayInstance = {
  open: () => void;
  on: (event: "payment.failed", handler: (response: RazorpayFailure) => void | Promise<void>) => void;
};

type RazorpayConstructor = new (options: {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  handler: (response: RazorpaySuccess) => void | Promise<void>;
  prefill?: { name?: string };
}) => RazorpayInstance;

function loadRazorpayScript() {
  return new Promise<boolean>((resolve) => {
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function getRazorpay() {
  return (window as Window & { Razorpay?: RazorpayConstructor }).Razorpay;
}

export function PaymentLinkClient({ bookingId, accessToken }: Props) {
  const [booking, setBooking] = useState<BookingAccessResponse["booking"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const refreshBooking = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/booking/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, accessToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to load booking");
      }
      setBooking(data.booking);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Failed to load booking");
    } finally {
      setLoading(false);
    }
  }, [accessToken, bookingId]);

  useEffect(() => {
    void refreshBooking();
  }, [refreshBooking]);

  const handlePay = async () => {
    setPaying(true);
    setError("");
    setSuccessMessage("");
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Could not load Razorpay checkout.");

      const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!key) throw new Error("Razorpay public key is missing.");

      const orderRes = await fetch("/api/payment/razorpay/retry-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, accessToken }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData?.error ?? "Failed to create payment order");

      const Razorpay = getRazorpay();
      if (!Razorpay) throw new Error("Razorpay checkout is unavailable.");

      const razorpay = new Razorpay({
        key,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.orderId,
        name: "All Tails",
        description: "Complete your booking payment",
        prefill: { name: booking?.customerName },
        handler: async (response: RazorpaySuccess) => {
          const verifyRes = await fetch("/api/payment/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bookingId,
              accessToken,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) throw new Error(verifyData?.error ?? "Payment verification failed");
          setSuccessMessage("Payment completed successfully.");
          await refreshBooking();
        },
      });

      razorpay.on("payment.failed", (response: RazorpayFailure) => {
        setError(response?.error?.description || "Payment failed.");
      });

      razorpay.open();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7fb] px-4 py-10">
      <div className="mx-auto max-w-[560px] rounded-[28px] border border-[#ece5ff] bg-white p-6 shadow-[0_18px_48px_rgba(73,44,120,0.08)]">
        <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">All Tails</div>
        <h1 className="mt-3 text-[30px] font-black tracking-[-0.03em] text-[#1f1f2c]">Complete your payment</h1>
        <p className="mt-2 text-[14px] leading-[1.7] text-[#6b7280]">
          This secure link was shared by the All Tails operations team for your booking.
        </p>

        {loading ? <p className="mt-6 text-[14px] text-[#7c8499]">Loading booking…</p> : null}
        {error ? <div className="mt-6 rounded-[16px] border border-[#f3d6d6] bg-[#fff8f8] px-4 py-3 text-[13px] text-[#b42318]">{error}</div> : null}
        {successMessage ? <div className="mt-6 rounded-[16px] border border-[#d8f0e3] bg-[#f4fcf7] px-4 py-3 text-[13px] text-[#15803d]">{successMessage}</div> : null}

        {booking && !loading ? (
          <>
            <div className="mt-6 space-y-3 rounded-[20px] border border-[#ece5ff] bg-[#fcfbff] p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[13px] text-[#8a90a6]">Service</span>
                <span className="text-right text-[14px] font-semibold text-[#2a2346]">{booking.serviceName}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[13px] text-[#8a90a6]">Date</span>
                <span className="text-right text-[14px] font-semibold text-[#2a2346]">{booking.selectedDate ?? "TBD"}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[13px] text-[#8a90a6]">Window</span>
                <span className="text-right text-[14px] font-semibold text-[#2a2346]">{booking.displayLabel ?? "TBD"}</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-[#eee8fb] pt-3">
                <span className="text-[13px] text-[#8a90a6]">Amount</span>
                <span className="text-right text-[18px] font-black text-[#2a2346]">₹{booking.finalAmount.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handlePay()}
              disabled={paying || booking.paymentStatus === "paid" || booking.paymentMethod !== "pay_now"}
              className="mt-6 inline-flex h-[50px] w-full items-center justify-center rounded-[16px] bg-[#6d5bd0] px-5 text-[15px] font-semibold text-white transition-colors hover:bg-[#5b4ab5] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {booking.paymentStatus === "paid" ? "Payment completed" : paying ? "Opening payment…" : "Pay now"}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
