"use client";

import { Camera, CheckCircle2, IndianRupee, QrCode } from "lucide-react";
import { useState } from "react";
import type { GroomerBookingView } from "../../../../../lib/groomerPortal";

const GROOMER_PAYMENT_QR_URL = "/images/groomer/payment-qr.jpg";
const GROOMER_GOOGLE_REVIEW_QR_URL = "/images/groomer/google-review-qr.png";
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

type Props = {
  mode: "simple" | "hindi";
  booking: GroomerBookingView;
  busy: string | null;
  onSave: (
    collectionMode: "cash" | "online" | "waived",
    amount: number,
    notes: string,
    image: File | null,
    applyServiceAmountChange: boolean
  ) => Promise<void>;
  onComplete: () => void;
};

function QrFullscreen({
  src,
  alt,
  title,
  hint,
  onClose,
}: {
  src: string;
  alt: string;
  title: string;
  hint: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[400] flex flex-col items-center justify-center bg-[#140e23] px-4">
      <div className="text-[13px] font-semibold uppercase tracking-[0.1em] text-white/60">{title}</div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="mt-4 w-full max-w-[300px] rounded-[28px] border-4 border-white/10 bg-white p-4 shadow-2xl"
      />
      <div className="mt-4 max-w-xs text-center text-[14px] leading-[1.7] text-white/75">{hint}</div>
      <button
        type="button"
        onClick={onClose}
        className="mt-8 rounded-full bg-white/10 px-6 py-3 text-[14px] font-semibold text-white"
      >
        {/* Always use simple label since it's a close action */}
        ✓ Done
      </button>
    </div>
  );
}

export function PaymentPhaseCard({ mode, booking, busy, onSave, onComplete }: Props) {
  const existingCollection = booking.payment.collection;
  const defaultAmount = String(existingCollection?.collectedAmount ?? booking.payment.finalAmount ?? "");

  const [collectionMode, setCollectionMode] = useState<"cash" | "online" | "waived">(
    (existingCollection?.collectionMode as "cash" | "online" | "waived") ?? "cash"
  );
  const [amount, setAmount] = useState(defaultAmount);
  const [notes, setNotes] = useState(existingCollection?.notes ?? "");
  const [image, setImage] = useState<File | null>(null);
  const [applyChange, setApplyChange] = useState(existingCollection?.serviceAmountUpdated ?? false);
  const [showServiceChanged, setShowServiceChanged] = useState(existingCollection?.serviceAmountUpdated ?? false);
  const [fullscreenQr, setFullscreenQr] = useState<"payment" | "review" | null>(null);
  const [localBusy, setLocalBusy] = useState(false);
  const [error, setError] = useState("");

  const expectedAmount = booking.payment.finalAmount;
  const parsedAmount = parseFloat(amount);
  const isWaived = collectionMode === "waived";
  const alreadySaved = !!existingCollection;

  const handleSave = async () => {
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setError(mode === "simple" ? "Valid amount daaliye." : "सही अमाउंट डालिए।");
      return;
    }
    if (applyChange && !notes.trim()) {
      setError(
        mode === "simple"
          ? "Service change ka short note likhein."
          : "सर्विस बदलाव का छोटा नोट लिखें।"
      );
      return;
    }
    if (!isWaived && !image && !alreadySaved) {
      setError(
        mode === "simple"
          ? "Payment ki photo ya screenshot add karein."
          : "पेमेंट की फोटो या स्क्रीनशॉट जोड़ें।"
      );
      return;
    }
    setError("");
    setLocalBusy(true);
    try {
      await onSave(collectionMode, parsedAmount, notes, image, applyChange);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kuch galat ho gaya.");
    } finally {
      setLocalBusy(false);
    }
  };

  const isBusy = busy !== null || localBusy;

  if (fullscreenQr === "payment") {
    return (
      <QrFullscreen
        src={GROOMER_PAYMENT_QR_URL}
        alt="Payment QR"
        title={mode === "simple" ? "Online Payment" : "ऑनलाइन पेमेंट"}
        hint={
          mode === "simple"
            ? "Customer se is QR ko scan karwayein. Screenshot save ho jayegi."
            : "कस्टमर से यह QR स्कैन करवाएं। स्क्रीनशॉट सेव हो जाएगा।"
        }
        onClose={() => setFullscreenQr(null)}
      />
    );
  }

  if (fullscreenQr === "review") {
    return (
      <QrFullscreen
        src={GROOMER_GOOGLE_REVIEW_QR_URL}
        alt="Google Review QR"
        title={mode === "simple" ? "Google Review" : "गूगल रिव्यू"}
        hint={
          mode === "simple"
            ? "Customer se review scan karwayein. Hum top par aayenge!"
            : "कस्टमर से रिव्यू स्कैन करवाएं। हम टॉप पर आएंगे!"
        }
        onClose={() => setFullscreenQr(null)}
      />
    );
  }

  return (
    <div className="space-y-4 rounded-[30px] border border-[#eadffd] bg-white p-4 shadow-[0_18px_48px_rgba(73,44,120,0.08)]">

      {/* Header */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">
          {mode === "simple" ? "Wrap up" : "काम ख़त्म करें"}
        </div>
        <h2 className="mt-1 text-[22px] font-black tracking-[-0.02em] text-[#1f1f2c]">
          {mode === "simple" ? "Payment aur review" : "पेमेंट और रिव्यू"}
        </h2>
        <div className="mt-1 text-[13px] leading-[1.6] text-[#6b7280]">
          {mode === "simple"
            ? "Pehle payment lo, phir review, phir booking complete karein."
            : "पहले पेमेंट लें, फिर रिव्यू, फिर बुकिंग पूरी करें।"}
        </div>
      </div>

      {/* Expected amount chip */}
      {expectedAmount != null ? (
        <div className="inline-flex items-center gap-2 rounded-full border border-[#dbeafe] bg-[#eff6ff] px-3 py-1.5">
          <IndianRupee className="h-3.5 w-3.5 text-[#2563eb]" />
          <span className="text-[13px] font-bold text-[#1d4ed8]">
            {mode === "simple" ? `Expected: ₹${expectedAmount}` : `अपेक्षित: ₹${expectedAmount}`}
          </span>
        </div>
      ) : null}

      {/* Payment mode — two big tap targets */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setCollectionMode("cash")}
          className={[
            "flex h-[72px] flex-col items-center justify-center rounded-[22px] border-2 text-[15px] font-black transition-all",
            collectionMode === "cash"
              ? "border-[#6d5bd0] bg-[#6d5bd0] text-white shadow-[0_6px_20px_rgba(109,91,208,0.35)]"
              : "border-[#ebe5fb] bg-[#fcfbff] text-[#5b4bc2]",
          ].join(" ")}
        >
          <span className="text-[24px]">💵</span>
          <span className="mt-0.5 text-[12px]">{mode === "simple" ? "Cash" : "कैश"}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setCollectionMode("online");
            setFullscreenQr("payment");
          }}
          className={[
            "flex h-[72px] flex-col items-center justify-center rounded-[22px] border-2 text-[15px] font-black transition-all",
            collectionMode === "online"
              ? "border-[#6d5bd0] bg-[#6d5bd0] text-white shadow-[0_6px_20px_rgba(109,91,208,0.35)]"
              : "border-[#ebe5fb] bg-[#fcfbff] text-[#5b4bc2]",
          ].join(" ")}
        >
          <span className="text-[24px]">📱</span>
          <span className="mt-0.5 text-[12px]">{mode === "simple" ? "Online" : "ऑनलाइन"}</span>
        </button>
      </div>

      {/* Amount input — always visible */}
      <div className="rounded-[22px] border border-[#ebe5fb] bg-[#fcfbff] p-4">
        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">
          {mode === "simple" ? "Amount received" : "प्राप्त अमाउंट"}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[18px] font-black text-[#4b5563]">₹</span>
          <input
            type="number"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-[52px] flex-1 rounded-[14px] border border-[#ddd1fb] bg-white px-4 text-[22px] font-black text-[#1f1f2c] outline-none focus:border-[#6d5bd0]"
            placeholder="0"
          />
        </div>
      </div>

      {/* Cash: photo capture */}
      {collectionMode === "cash" && !isWaived ? (
        <label
          className={[
            "flex h-[64px] w-full items-center justify-center gap-2 rounded-[22px] border-2 text-[15px] font-semibold",
            image
              ? "border-[#16a34a] bg-[#f0fdf4] text-[#15803d]"
              : "border-[#6d5bd0] bg-[#6d5bd0] text-white",
            isBusy ? "opacity-50" : "",
          ].join(" ")}
        >
          <Camera className="h-5 w-5" />
          {image
            ? (mode === "simple" ? `Photo ready: ${image.name.slice(0, 20)}` : `फोटो तैयार`)
            : (mode === "simple" ? "Cash photo kheecho" : "कैश फोटो खींचो")}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={isBusy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && file.size <= MAX_UPLOAD_BYTES) setImage(file);
              e.currentTarget.value = "";
            }}
          />
        </label>
      ) : null}

      {/* Online: show QR button + screenshot upload */}
      {collectionMode === "online" ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setFullscreenQr("payment")}
            className="flex h-[64px] w-full items-center justify-center gap-2 rounded-[22px] border-2 border-[#6d5bd0] bg-[#6d5bd0] text-[15px] font-semibold text-white"
          >
            <QrCode className="h-5 w-5" />
            {mode === "simple" ? "Payment QR fullscreen" : "पेमेंट QR फुलस्क्रीन"}
          </button>
          <label
            className={[
              "flex h-[64px] w-full cursor-pointer items-center justify-center gap-2 rounded-[22px] border-2 text-[15px] font-semibold",
              image
                ? "border-[#16a34a] bg-[#f0fdf4] text-[#15803d]"
                : "border-dashed border-[#6d5bd0] bg-[#f5f3ff] text-[#6d5bd0]",
              isBusy ? "opacity-50" : "",
            ].join(" ")}
          >
            <Camera className="h-5 w-5" />
            {image
              ? (mode === "simple" ? `Screenshot ready: ${image.name.slice(0, 18)}` : "स्क्रीनशॉट तैयार")
              : (mode === "simple" ? "Payment screenshot add karein" : "पेमेंट स्क्रीनशॉट जोड़ें")}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={isBusy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && file.size <= MAX_UPLOAD_BYTES) setImage(file);
                e.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      ) : null}

      {/* Google Review QR */}
      <button
        type="button"
        onClick={() => setFullscreenQr("review")}
        className="flex h-[64px] w-full items-center justify-center gap-2 rounded-[22px] border-2 border-[#f59e0b] bg-[#fffbeb] text-[15px] font-semibold text-[#92400e]"
      >
        <span className="text-[20px]">⭐</span>
        {mode === "simple" ? "Google Review QR" : "गूगल रिव्यू QR"}
      </button>

      {/* Service changed toggle */}
      {!showServiceChanged ? (
        <button
          type="button"
          onClick={() => setShowServiceChanged(true)}
          className="text-[12px] font-semibold text-[#6b7280] underline underline-offset-2"
        >
          {mode === "simple" ? "Service changed?" : "सर्विस बदली?"}
        </button>
      ) : (
        <div className="rounded-[20px] border border-[#ebe5fb] bg-[#fcfbff] p-4 space-y-3">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={applyChange}
              onChange={(e) => setApplyChange(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[#d8cff8] text-[#6d5bd0]"
            />
            <span>
              <span className="block text-[14px] font-semibold text-[#2a2346]">
                {mode === "simple" ? "Apply service amount change" : "सर्विस अमाउंट बदलाव लागू करें"}
              </span>
              <span className="mt-0.5 block text-[12px] text-[#6b7280]">
                {mode === "simple"
                  ? "Tick karein agar upgrade/downgrade final ho gaya."
                  : "टिक करें अगर अपग्रेड/डाउनग्रेड फाइनल हो गया।"}
              </span>
            </span>
          </label>
          {applyChange ? (
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-[16px] border border-[#ddd1fb] px-4 py-3 text-[14px] outline-none"
              placeholder={mode === "simple" ? "Change ka short note likhein" : "बदलाव का छोटा नोट लिखें"}
            />
          ) : null}
        </div>
      )}

      {/* Error */}
      {error ? (
        <div className="rounded-[16px] bg-[#fff1f2] px-4 py-3 text-[13px] font-semibold text-[#be123c]">
          {error}
        </div>
      ) : null}

      {/* Already saved confirmation */}
      {alreadySaved ? (
        <div className={`rounded-[18px] px-4 py-3 text-[14px] leading-[1.7] ${existingCollection!.mismatchFlag ? "bg-[#fff1f2] text-[#be123c]" : "bg-[#effaf3] text-[#15803d]"}`}>
          {existingCollection!.mismatchFlag
            ? (mode === "simple"
              ? `Mismatch: ₹${existingCollection!.collectedAmount} mila, expected ₹${existingCollection!.expectedAmount}`
              : `मिसमैच: ₹${existingCollection!.collectedAmount} मिला, ₹${existingCollection!.expectedAmount} अपेक्षित`)
            : (mode === "simple"
              ? `Payment ₹${existingCollection!.collectedAmount} save ho gaya ✓`
              : `पेमेंट ₹${existingCollection!.collectedAmount} सेव हो गया ✓`)}
        </div>
      ) : null}

      {/* Save payment */}
      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={isBusy}
        className="flex h-[60px] w-full items-center justify-center gap-2 rounded-[22px] bg-[#149c6d] text-[16px] font-semibold text-white disabled:opacity-50"
      >
        {isBusy
          ? (mode === "simple" ? "Save ho raha hai..." : "सेव हो रहा है...")
          : (mode === "simple" ? "Payment save karein" : "पेमेंट सेव करें")}
      </button>

      {/* Complete booking */}
      <button
        type="button"
        onClick={onComplete}
        disabled={busy !== null || booking.status === "completed"}
        className="flex h-[60px] w-full items-center justify-center gap-2 rounded-[22px] bg-[#6d5bd0] text-[16px] font-semibold text-white disabled:opacity-50"
      >
        <CheckCircle2 className="h-5 w-5" />
        {booking.status === "completed"
          ? (mode === "simple" ? "Booking complete ✓" : "बुकिंग पूरी ✓")
          : (mode === "simple" ? "Booking complete karein" : "बुकिंग पूरी करें")}
      </button>
    </div>
  );
}
