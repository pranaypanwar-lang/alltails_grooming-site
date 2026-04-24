"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  IndianRupee,
  MapPinned,
  Scissors,
  Video,
} from "lucide-react";
import type { GroomerBookingView } from "../../../../lib/groomerPortal";
import { deriveActionMoment, deriveJobFlowPsychology, resolvePsychologyText } from "../../../../lib/groomerPsychology";

type LanguageMode = "simple" | "hindi";

type TextValue = {
  simple: string;
  hindi: string;
};

type MomentToast = {
  title: string;
  detail: string;
  tone: "celebrate" | "warning" | "focus" | "steady";
} | null;

const STATUS_LABELS: Record<string, TextValue> = {
  unassigned: { simple: "Assign nahi hua", hindi: "असाइन नहीं हुआ" },
  assigned: { simple: "Assign ho gaya", hindi: "असाइन हो गया" },
  en_route: { simple: "Nikal gaye", hindi: "निकल गए" },
  started: { simple: "Kaam shuru", hindi: "काम शुरू" },
  completed: { simple: "Complete", hindi: "पूरा" },
  issue: { simple: "Issue", hindi: "समस्या" },
  pending_payment: { simple: "Payment baaki", hindi: "पेमेंट बाकी" },
  confirmed: { simple: "Confirmed", hindi: "कन्फर्म" },
  cancelled: { simple: "Cancel", hindi: "रद्द" },
};

const PAYMENT_MODE_LABELS: Record<"cash" | "online" | "waived", TextValue> = {
  cash: { simple: "Cash", hindi: "कैश" },
  online: { simple: "Online", hindi: "ऑनलाइन" },
  waived: { simple: "Maaf", hindi: "शुल्क माफ़" },
};

function tx(mode: LanguageMode, value: TextValue) {
  return value[mode];
}

function statusChipClass(status: string) {
  if (status === "completed" || status === "sent" || status === "confirmed") return "bg-[#effaf3] text-[#15803d]";
  if (status === "failed" || status === "issue" || status === "cancelled") return "bg-[#fff1f2] text-[#be123c]";
  if (status === "queued" || status === "started") return "bg-[#eef2ff] text-[#4338ca]";
  return "bg-[#fff8eb] text-[#b45309]";
}

function formatStatus(status: string, mode: LanguageMode) {
  return tx(mode, STATUS_LABELS[status] ?? {
    simple: status.replace(/_/g, " "),
    hindi: status.replace(/_/g, " "),
  });
}

function formatDate(value: string | null, mode: LanguageMode) {
  if (!value) return mode === "simple" ? "Date pending" : "तारीख बाकी है";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    weekday: "short",
  });
}

function normalizePhoneHref(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : null;
}

function buildMapsHref(booking: GroomerBookingView) {
  if (booking.addressInfo.serviceLocationUrl) {
    return booking.addressInfo.serviceLocationUrl;
  }

  const queryParts = [
    booking.addressInfo.serviceAddress,
    booking.addressInfo.serviceLandmark,
    booking.addressInfo.servicePincode,
    booking.customer.city,
  ].filter(Boolean);

  if (!queryParts.length) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryParts.join(", "))}`;
}

function formatTimer(seconds: number) {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  return [hours, minutes, secs].map((value) => String(value).padStart(2, "0")).join(":");
}

function getSlaStateColor(secondsRemaining: number) {
  if (secondsRemaining <= 0) return "bg-[#fff1f2] text-[#be123c]";
  if (secondsRemaining <= 15 * 60) return "bg-[#fff8eb] text-[#b45309]";
  return "bg-[#effaf3] text-[#15803d]";
}

async function getVideoDuration(file: File) {
  return new Promise<number>((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = video.duration;
      URL.revokeObjectURL(url);
      resolve(duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Video open nahi ho paaya. Dobara try karein."));
    };
    video.src = url;
  });
}

async function validateCapture(file: File) {
  if (file.type.startsWith("video/")) {
    const duration = await getVideoDuration(file);
    if (duration > 15.5) {
      throw new Error("Video 10-15 second ke andar rakhein.");
    }
  }

  if (file.type.startsWith("image/") && file.size > 12 * 1024 * 1024) {
    throw new Error("Photo 12MB se chhoti rakhein.");
  }

  if (file.type.startsWith("video/") && file.size > 50 * 1024 * 1024) {
    throw new Error("Video 50MB se chhota rakhein.");
  }
}

function normalizeRecordedVideoMimeType(type: string) {
  const baseType = type.split(";")[0]?.trim().toLowerCase();
  if (baseType === "video/mp4") return "video/mp4";
  return "video/webm";
}

function SectionTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">{eyebrow}</div>
      <h2 className="mt-1 text-[20px] font-black tracking-[-0.02em] text-[#1f1f2c]">{title}</h2>
      {subtitle ? <p className="mt-1 text-[13px] leading-[1.6] text-[#6b7280]">{subtitle}</p> : null}
    </div>
  );
}

function MediaStrip({
  title,
  urls,
}: {
  title: string;
  urls: string[];
}) {
  if (!urls.length) return null;

  return (
    <div>
      <div className="mb-2 text-[12px] font-semibold text-[#4b5563]">{title}</div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {urls.map((url, index) => (
          <a
            key={`${title}-${url}-${index}`}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="min-w-[110px] overflow-hidden rounded-[16px] border border-[#ece5ff] bg-white"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`${title} ${index + 1}`} className="h-[110px] w-[110px] object-cover" />
            <div className="border-t border-[#f3f0fb] px-3 py-2 text-[11px] font-semibold text-[#6d5bd0]">
              Photo {index + 1}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function CaptureButton({
  label,
  accept,
  capture,
  disabled,
  tone = "default",
  icon,
  onPick,
}: {
  label: string;
  accept: string;
  capture?: "environment";
  disabled: boolean;
  tone?: "default" | "primary";
  icon?: ReactNode;
  onPick: (file: File) => void;
}) {
  return (
    <label
      className={[
        "inline-flex min-h-[48px] items-center justify-center rounded-[16px] border px-4 py-3 text-[14px] font-semibold",
        tone === "primary"
          ? "border-[#6d5bd0] bg-[#6d5bd0] text-white"
          : "border-[#ddd1fb] bg-white text-[#5b4bc2]",
        disabled ? "opacity-50" : "",
      ].join(" ")}
    >
      {icon ? <span className="mr-2 inline-flex">{icon}</span> : null}
      {label}
      <input
        type="file"
        accept={accept}
        capture={capture}
        className="hidden"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onPick(file);
          event.currentTarget.value = "";
        }}
      />
    </label>
  );
}

function ActionButton({
  label,
  disabled,
  tone = "default",
  icon,
  onClick,
}: {
  label: string;
  disabled: boolean;
  tone?: "default" | "primary";
  icon?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "inline-flex min-h-[48px] items-center justify-center rounded-[16px] border px-4 py-3 text-[14px] font-semibold",
        tone === "primary"
          ? "border-[#6d5bd0] bg-[#6d5bd0] text-white"
          : "border-[#ddd1fb] bg-white text-[#5b4bc2]",
        disabled ? "opacity-50" : "",
      ].join(" ")}
    >
      {icon ? <span className="mr-2 inline-flex">{icon}</span> : null}
      {label}
    </button>
  );
}

function ErrorModal({
  message,
  onClose,
  mode,
}: {
  message: string;
  onClose: () => void;
  mode: LanguageMode;
}) {
  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-[rgba(20,14,35,0.42)] px-4 pb-6 pt-20">
      <div className="w-full max-w-md rounded-[28px] bg-white p-5 shadow-2xl">
        <div className="text-[18px] font-black tracking-[-0.02em] text-[#1f1f2c]">
          {mode === "simple" ? "Dhyan dein" : "ध्यान दें"}
        </div>
        <div className="mt-2 text-[14px] leading-[1.7] text-[#4b5563]">{message}</div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-[16px] bg-[#6d5bd0] px-4 py-3 text-[14px] font-semibold text-white"
        >
          {mode === "simple" ? "Theek hai" : "ठीक है"}
        </button>
      </div>
    </div>
  );
}

function RewardModal({
  rewards,
  summary,
  onClose,
  mode,
}: {
  rewards: Array<{ summary: string; xpAwarded: number; rewardPointsAwarded?: number }>;
  summary: {
    teamMember: { name: string; currentXp: number; currentRank: string };
    totalXpAwarded: number;
    totalRewardPointsAwarded?: number;
    prestigeCredits?: number;
  } | null;
  onClose: () => void;
  mode: LanguageMode;
}) {
  return (
    <div className="fixed inset-0 z-[320] flex items-end justify-center bg-[rgba(20,14,35,0.42)] px-4 pb-6 pt-20">
      <div className="w-full max-w-md rounded-[28px] bg-white p-5 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#effaf3] text-[#15803d]">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[18px] font-black tracking-[-0.02em] text-[#1f1f2c]">
              {mode === "simple" ? "Booking complete" : "बुकिंग पूरी"}
            </div>
            <div className="text-[13px] text-[#6b7280]">
              {mode === "simple" ? "Rewards add ho gaye." : "रिवॉर्ड जुड़ गए।"}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-[18px] bg-[#faf8ff] p-4">
          <div className="text-[13px] font-semibold text-[#2a2346]">
            {summary?.teamMember.name ?? (mode === "simple" ? "Groomer" : "ग्रूमर")}
          </div>
          <div className="mt-1 text-[12px] text-[#6b7280]">
            {mode === "simple"
              ? `Rank: ${summary?.teamMember.currentRank ?? "Groomer Trainee"} · XP: ${summary?.teamMember.currentXp ?? 0}`
              : `रैंक: ${summary?.teamMember.currentRank ?? "Groomer Trainee"} · एक्सपी: ${summary?.teamMember.currentXp ?? 0}`}
          </div>
          <div className="mt-1 text-[12px] text-[#6b7280]">
            {mode === "simple"
              ? `Prestige Credits: ${summary?.prestigeCredits ?? 0}`
              : `प्रेस्टीज क्रेडिट्स: ${summary?.prestigeCredits ?? 0}`}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {rewards.length ? rewards.map((reward, index) => (
            <div key={`${reward.summary}-${index}`} className="flex items-center justify-between rounded-[16px] border border-[#ece5ff] px-4 py-3 text-[13px]">
              <span className="text-[#2a2346]">{reward.summary}</span>
              <span className="text-right">
                <span className="block font-semibold text-[#15803d]">+{reward.xpAwarded} XP</span>
                {(reward.rewardPointsAwarded ?? 0) > 0 ? (
                  <span className="block text-[11px] font-semibold text-[#7c3aed]">+{reward.rewardPointsAwarded} credits</span>
                ) : null}
              </span>
            </div>
          )) : (
            <div className="rounded-[16px] border border-[#ece5ff] px-4 py-3 text-[13px] text-[#6b7280]">
              {mode === "simple" ? "Is booking par koi naya reward add nahi hua." : "इस बुकिंग पर कोई नया रिवॉर्ड नहीं जुड़ा।"}
            </div>
          )}
        </div>

        {summary ? (
          <div className="mt-4 rounded-[16px] bg-[#f8f5ff] px-4 py-3 text-[13px] text-[#4b5563]">
            {mode === "simple"
              ? `Is booking se total +${summary.totalXpAwarded} XP aur +${summary.totalRewardPointsAwarded ?? 0} credits jud gaye.`
              : `इस बुकिंग से कुल +${summary.totalXpAwarded} एक्सपी और +${summary.totalRewardPointsAwarded ?? 0} क्रेडिट्स जुड़े।`}
          </div>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-[16px] bg-[#6d5bd0] px-4 py-3 text-[14px] font-semibold text-white"
        >
          {mode === "simple" ? "Theek hai" : "ठीक है"}
        </button>
      </div>
    </div>
  );
}

function formatRecordingSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function LiveVideoRecorderModal({
  mode,
  busy,
  elapsedSeconds,
  isRecording,
  hasRecordedFile,
  videoRef,
  onStart,
  onStop,
  onUseRecording,
  onRetake,
  onClose,
}: {
  mode: LanguageMode;
  busy: boolean;
  elapsedSeconds: number;
  isRecording: boolean;
  hasRecordedFile: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onStart: () => void;
  onStop: () => void;
  onUseRecording: () => void;
  onRetake: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[320] flex items-end justify-center bg-[rgba(20,14,35,0.56)] px-4 pb-4 pt-10">
      <div className="w-full max-w-md rounded-[28px] bg-white p-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[18px] font-black tracking-[-0.02em] text-[#1f1f2c]">
              {mode === "simple" ? "Live video proof" : "लाइव वीडियो प्रूफ"}
            </div>
            <div className="mt-1 text-[13px] leading-[1.6] text-[#6b7280]">
              {mode === "simple"
                ? "Gallery upload band hai. Yahin se live video record karke hi proof bheja jayega."
                : "गैलरी अपलोड बंद है। यहीं से लाइव वीडियो रिकॉर्ड करके ही प्रूफ भेजा जाएगा।"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-full border border-[#e7ddfb] bg-[#faf8ff] px-3 py-1.5 text-[12px] font-semibold text-[#6d5bd0] disabled:opacity-50"
          >
            {mode === "simple" ? "Close" : "बंद"}
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-[22px] border border-[#e6def8] bg-[#140e23]">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={!hasRecordedFile}
            controls={hasRecordedFile}
            className="aspect-[3/4] w-full bg-black object-cover"
          />
        </div>

        <div className="mt-3 flex items-center justify-between rounded-[18px] bg-[#f8f5ff] px-4 py-3 text-[13px] font-semibold text-[#5b4bc2]">
          <span>
            {isRecording
              ? mode === "simple"
                ? "Recording live..."
                : "लाइव रिकॉर्ड हो रहा है..."
              : hasRecordedFile
                ? mode === "simple"
                  ? "Preview ready"
                  : "प्रीव्यू तैयार है"
                : mode === "simple"
                  ? "Camera ready"
                  : "कैमरा तैयार है"}
          </span>
          <span>{formatRecordingSeconds(elapsedSeconds)} / 00:15</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {!isRecording && !hasRecordedFile ? (
            <button
              type="button"
              onClick={onStart}
              disabled={busy}
              className="flex-1 rounded-[16px] bg-[#6d5bd0] px-4 py-3 text-[14px] font-semibold text-white disabled:opacity-50"
            >
              {mode === "simple" ? "Start recording" : "रिकॉर्डिंग शुरू करें"}
            </button>
          ) : null}

          {isRecording ? (
            <button
              type="button"
              onClick={onStop}
              disabled={busy}
              className="flex-1 rounded-[16px] bg-[#be123c] px-4 py-3 text-[14px] font-semibold text-white disabled:opacity-50"
            >
              {mode === "simple" ? "Stop recording" : "रिकॉर्डिंग रोकें"}
            </button>
          ) : null}

          {hasRecordedFile ? (
            <>
              <button
                type="button"
                onClick={onRetake}
                disabled={busy}
                className="rounded-[16px] border border-[#ddd1fb] bg-white px-4 py-3 text-[14px] font-semibold text-[#5b4bc2] disabled:opacity-50"
              >
                {mode === "simple" ? "Retake" : "फिर से रिकॉर्ड करें"}
              </button>
              <button
                type="button"
                onClick={onUseRecording}
                disabled={busy}
                className="flex-1 rounded-[16px] bg-[#16a34a] px-4 py-3 text-[14px] font-semibold text-white disabled:opacity-50"
              >
                {busy
                  ? mode === "simple"
                    ? "Uploading..."
                    : "अपलोड हो रहा है..."
                  : mode === "simple"
                    ? "Use this video"
                    : "यही वीडियो भेजें"}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StepCard({
  title,
  hint,
  done,
  completedAt,
  expanded,
  defaultIcon,
  onToggle,
  children,
  mode,
}: {
  title: string;
  hint?: string | null;
  done: boolean;
  completedAt?: string | null;
  expanded: boolean;
  defaultIcon?: ReactNode;
  onToggle?: () => void;
  children?: ReactNode;
  mode: LanguageMode;
}) {
  return (
    <div className={`rounded-[24px] border p-4 ${done ? "border-[#b9ebcf] bg-[#f4fff8]" : "border-[#ebe5fb] bg-[#fcfbff]"}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${done ? "border-[#16a34a] bg-[#16a34a] text-white" : "border-[#d7cff3] bg-white text-[#8b7be7]"}`}>
          {done ? <CheckCircle2 className="h-4 w-4" /> : defaultIcon ?? <Circle className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onToggle}
            className="flex w-full items-start justify-between gap-3 text-left"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-[17px] font-black tracking-[-0.02em] text-[#26233a]">{title}</div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${done ? "bg-[#dff7e7] text-[#15803d]" : "bg-[#f1f3f5] text-[#667085]"}`}>
                  {done ? (mode === "simple" ? "Ho gaya" : "हो गया") : (mode === "simple" ? "Baaki" : "बाकी")}
                </span>
              </div>
              {hint ? <div className="mt-2 pr-2 text-[14px] leading-[1.7] text-[#667085]">{hint}</div> : null}
              {completedAt ? (
                <div className="mt-2 text-[12px] font-medium text-[#8a90a6]">
                  {mode === "simple" ? "Save hua:" : "सेव हुआ:"} {new Date(completedAt).toLocaleString("en-IN")}
                </div>
              ) : null}
            </div>
            <span className="mt-0.5 inline-flex rounded-full border border-[#e8defd] bg-white p-1 text-[#7a67d8]">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </span>
          </button>
          {expanded && children ? <div className="mt-4">{children}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function GroomerJobClient({
  initialBooking,
  token,
}: {
  initialBooking: GroomerBookingView;
  token?: string;
}) {
  const [booking, setBooking] = useState(initialBooking);
  const [busy, setBusy] = useState<string | null>(null);
  const [modalError, setModalError] = useState("");
  const [rewardModal, setRewardModal] = useState<{
    rewards: Array<{ summary: string; xpAwarded: number; rewardPointsAwarded?: number }>;
    summary: {
      teamMember: { name: string; currentXp: number; currentRank: string };
      totalXpAwarded: number;
      totalRewardPointsAwarded?: number;
      prestigeCredits?: number;
    } | null;
  } | null>(null);
  const [languageMode, setLanguageMode] = useState<LanguageMode>("simple");
  const [expandedStepKey, setExpandedStepKey] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState(booking.groomerMember?.id ?? "");
  const [paymentMode, setPaymentMode] = useState<"cash" | "online" | "waived">(
    (booking.payment.collection?.collectionMode as "cash" | "online" | "waived") ?? "cash"
  );
  const customerCallHref = useMemo(() => normalizePhoneHref(booking.customer.phone), [booking.customer.phone]);
  const mapsHref = useMemo(() => buildMapsHref(booking), [booking]);
  const [paymentAmount, setPaymentAmount] = useState(
    String(booking.payment.collection?.collectedAmount ?? booking.payment.finalAmount)
  );
  const [paymentNotes, setPaymentNotes] = useState(booking.payment.collection?.notes ?? "");
  const [applyServiceAmountChange, setApplyServiceAmountChange] = useState(
    booking.payment.collection?.serviceAmountUpdated ?? false
  );
  const [paymentImage, setPaymentImage] = useState<File | null>(null);
  const [activeVideoStepKey, setActiveVideoStepKey] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordedVideoFile, setRecordedVideoFile] = useState<File | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [momentToast, setMomentToast] = useState<MomentToast>(null);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedBlobUrlRef = useRef<string | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : "";

  useEffect(() => {
    setPaymentMode((booking.payment.collection?.collectionMode as "cash" | "online" | "waived") ?? "cash");
    setPaymentAmount(String(booking.payment.collection?.collectedAmount ?? booking.payment.finalAmount));
    setPaymentNotes(booking.payment.collection?.notes ?? "");
    setApplyServiceAmountChange(booking.payment.collection?.serviceAmountUpdated ?? false);
  }, [booking.payment.collection, booking.payment.finalAmount]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isRecordingVideo) return;
    const timer = window.setInterval(() => {
      setRecordingSeconds((prev) => {
        const next = prev + 1;
        if (next >= 15) {
          mediaRecorderRef.current?.state === "recording" && mediaRecorderRef.current.stop();
          return 15;
        }
        return next;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRecordingVideo]);

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (recordedBlobUrlRef.current) {
        URL.revokeObjectURL(recordedBlobUrlRef.current);
      }
    };
  }, []);

  const visibleChecklistSteps = useMemo(
    () => booking.sopSteps.filter((step) => !["en_route", "arrived", "payment_proof"].includes(step.key)),
    [booking.sopSteps]
  );
  const paymentStep = booking.sopSteps.find((step) => step.key === "payment_proof") ?? null;
  const petSettledStep = visibleChecklistSteps.find((step) => step.key === "pet_settled") ?? null;
  const mediaSteps = visibleChecklistSteps.filter((step) => step.key !== "pet_settled");

  const currentRelevantStepKey = useMemo(() => {
    const nextPending = visibleChecklistSteps.find((step) => step.status !== "completed");
    if (nextPending) return nextPending.key;
    if (paymentStep && paymentStep.status !== "completed") return paymentStep.key;
    return visibleChecklistSteps[0]?.key ?? paymentStep?.key ?? null;
  }, [paymentStep, visibleChecklistSteps]);

  const activeExpandedKey = expandedStepKey ?? currentRelevantStepKey;
  const slaStartAt = booking.bookingWindow?.startTime ? new Date(booking.bookingWindow.startTime).getTime() : null;
  const slaDurationSeconds = (booking.service.sla?.durationMinutes ?? 90) * 60;
  const slaDeadlineAt = slaStartAt ? slaStartAt + slaDurationSeconds * 1000 : null;
  const slaSecondsRemaining = slaDeadlineAt ? Math.round((slaDeadlineAt - now) / 1000) : null;
  const slaSecondsElapsed = slaStartAt ? Math.max(0, Math.round((now - slaStartAt) / 1000)) : null;
  const completedRequiredStepCount = booking.sopSteps.filter((step) => step.requiredForCompletion && step.status === "completed").length;
  const totalRequiredStepCount = booking.sopSteps.filter((step) => step.requiredForCompletion).length;
  const reviewCompleted = booking.sopSteps.find((step) => step.key === "review_proof")?.status === "completed";
  const jobPsychology = deriveJobFlowPsychology({
    dispatchState: booking.dispatchState,
    bookingStatus: booking.status,
    nextBookingMinutesAway: booking.bookingWindow?.startTime ? Math.round((new Date(booking.bookingWindow.startTime).getTime() - now) / 60000) : null,
    slaSecondsRemaining,
    completedRequiredStepCount,
    totalRequiredStepCount,
    reviewCompleted,
    reviewCount: booking.groomerMember?.currentXp ?? 0,
  });
  const psychologyMode = languageMode === "simple" ? "hinglish" : "hindi";
  const jobPsychologyTitle = resolvePsychologyText(jobPsychology.stateKey, psychologyMode);

  const cleanupLiveRecorder = () => {
    mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    mediaRecorderRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    recordingChunksRef.current = [];
    setIsRecordingVideo(false);
    setRecordingSeconds(0);
    if (recordedBlobUrlRef.current) {
      URL.revokeObjectURL(recordedBlobUrlRef.current);
      recordedBlobUrlRef.current = null;
    }
    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = null;
      liveVideoRef.current.removeAttribute("src");
      liveVideoRef.current.load();
    }
  };

  const setupLiveVideoPreview = async () => {
    cleanupLiveRecorder();
    setRecordedVideoFile(null);

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      throw new Error(
        languageMode === "simple"
          ? "Phone browser live video recording support nahi de raha. Chrome update karke dobara try karein."
          : "फोन ब्राउज़र लाइव वीडियो रिकॉर्डिंग सपोर्ट नहीं दे रहा। Chrome अपडेट करके दोबारा ट्राई करें।"
      );
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: true,
    });
    mediaStreamRef.current = stream;

    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = stream;
      await liveVideoRef.current.play().catch(() => undefined);
    }
  };

  const openLiveVideoRecorder = async (stepKey: string) => {
    setActiveVideoStepKey(stepKey);
    try {
      await setupLiveVideoPreview();
    } catch (error) {
      setActiveVideoStepKey(null);
      cleanupLiveRecorder();
      throw error;
    }
  };

  const startLiveRecording = () => {
    const stream = mediaStreamRef.current;
    if (!stream) {
      throw new Error(
        languageMode === "simple"
          ? "Camera ready nahi hai. Dobara try karein."
          : "कैमरा तैयार नहीं है। दोबारा ट्राई करें।"
      );
    }

    const preferredMimeTypes = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    const supportedMimeType =
      preferredMimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
    const recorder = supportedMimeType
      ? new MediaRecorder(stream, { mimeType: supportedMimeType })
      : new MediaRecorder(stream);

    recordingChunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordingChunksRef.current.push(event.data);
      }
    };
    recorder.onstop = async () => {
      try {
        setIsRecordingVideo(false);
        const normalizedMimeType = normalizeRecordedVideoMimeType(recorder.mimeType || "video/webm");
        const blob = new Blob(recordingChunksRef.current, { type: normalizedMimeType });
        if (!blob.size) {
          throw new Error(
            languageMode === "simple"
              ? "Recorded video empty aa raha hai. Dobara record karein."
              : "रिकॉर्ड किया गया वीडियो खाली आ रहा है। दोबारा रिकॉर्ड करें।"
          );
        }
        const extension = normalizedMimeType === "video/mp4" ? "mp4" : "webm";
        const file = new File([blob], `live-proof-${Date.now()}.${extension}`, {
          type: normalizedMimeType,
        });
        setRecordedVideoFile(file);

        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;

        if (recordedBlobUrlRef.current) {
          URL.revokeObjectURL(recordedBlobUrlRef.current);
        }
        recordedBlobUrlRef.current = URL.createObjectURL(file);

        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = null;
          liveVideoRef.current.src = recordedBlobUrlRef.current;
          liveVideoRef.current.muted = false;
          liveVideoRef.current.controls = true;
          await liveVideoRef.current.play().catch(() => undefined);
        }
      } catch (error) {
        setRecordedVideoFile(null);
        setModalError(
          error instanceof Error
            ? error.message
            : languageMode === "simple"
              ? "Video तैयार नहीं हो पाया. Dobara try karein."
              : "वीडियो तैयार नहीं हो पाया। दोबारा ट्राई करें।"
        );
      }
    };

    mediaRecorderRef.current = recorder;
    setRecordingSeconds(0);
    setIsRecordingVideo(true);
    recorder.start(250);
  };

  const stopLiveRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const closeLiveVideoRecorder = () => {
    cleanupLiveRecorder();
    setRecordedVideoFile(null);
    setActiveVideoStepKey(null);
  };

  const retakeLiveRecording = async () => {
    try {
      await setupLiveVideoPreview();
    } catch (error) {
      setModalError(error instanceof Error ? error.message : "Camera dobara nahi khul paaya.");
    }
  };

  const openMomentToast = (input: Parameters<typeof deriveActionMoment>[0]) => {
    const moment = deriveActionMoment(input);
    setMomentToast({
      title: resolvePsychologyText(moment.titleKey, psychologyMode, moment.titleParams),
      detail: moment.detail,
      tone: moment.tone,
    });
  };

  const refresh = async () => {
    const res = await fetch(`/api/groomer/bookings/${booking.id}${tokenQuery}`, {
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error ?? "Booking refresh nahi ho paaya.");
    setBooking(data.booking);
    setSelectedMemberId(data.booking.groomerMember?.id ?? "");
  };

  const runAction = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    try {
      await action();
      await refresh();
    } catch (actionError) {
      setModalError(actionError instanceof Error ? actionError.message : "Kuch galat ho gaya. Dobara try karein.");
    } finally {
      setBusy(null);
    }
  };

  const postJson = async (path: string, body: unknown) => {
    const res = await fetch(`${path}${tokenQuery}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error ?? "Request fail ho gayi.");
    return data;
  };

  const uploadStepMedia = async (
    stepKey: string,
    file: File,
    options?: { skipClientValidation?: boolean }
  ) => {
    const normalizedFile =
      file.type.startsWith("video/")
        ? new File([file], file.name || `live-proof-${Date.now()}.webm`, {
            type: normalizeRecordedVideoMimeType(file.type),
            lastModified: file.lastModified || Date.now(),
          })
        : file;

    if (!options?.skipClientValidation) {
      await validateCapture(normalizedFile);
    }

    const formData = new FormData();
    formData.set("stepKey", stepKey);
    formData.set("file", normalizedFile, normalizedFile.name);

    const res = await fetch(`/api/groomer/bookings/${booking.id}/sop/proof${tokenQuery}`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error ?? "Upload nahi ho paaya.");
    if (data?.rewardsDelta?.length) {
      setRewardModal({
        rewards: data.rewardsDelta,
        summary: data.rewardSummary
          ? {
              teamMember: data.rewardSummary.teamMember,
              totalXpAwarded: data.rewardSummary.totalXpAwarded,
              totalRewardPointsAwarded: data.rewardSummary.totalRewardPointsAwarded,
              prestigeCredits: data.rewardSummary.gamification?.prestigeCredits,
            }
          : null,
      });
    }
    const xpAwarded = Array.isArray(data?.rewardsDelta)
      ? data.rewardsDelta.reduce((sum: number, reward: { xpAwarded?: number }) => sum + Number(reward?.xpAwarded ?? 0), 0)
      : 0;
    const rewardCreditsAwarded = Array.isArray(data?.rewardsDelta)
      ? data.rewardsDelta.reduce((sum: number, reward: { rewardPointsAwarded?: number }) => sum + Number(reward?.rewardPointsAwarded ?? 0), 0)
      : 0;
    openMomentToast({
      action: "step_saved",
      stepKey,
      xpAwarded,
      rewardCreditsAwarded,
      prestigeCredits: data?.rewardSummary?.gamification?.prestigeCredits,
    });
  };

  const savePayment = async () => {
    const normalizedAmount = Number(paymentAmount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount < 0) {
      throw new Error(languageMode === "simple"
        ? "Valid amount daaliye."
        : "सही अमाउंट डालिए।");
    }

    if (applyServiceAmountChange && !paymentNotes.trim()) {
      throw new Error(languageMode === "simple"
        ? "Upgrade ya downgrade ka short note likhna zaroori hai."
        : "अपग्रेड या डाउनग्रेड का छोटा नोट लिखना ज़रूरी है।");
    }

    if (paymentMode !== "waived" && !paymentImage) {
      throw new Error(languageMode === "simple"
        ? "Payment ke saath photo ya screenshot zaroor add karein."
        : "पेमेंट के साथ फोटो या स्क्रीनशॉट ज़रूर जोड़िए।");
    }

    if (paymentImage) {
      await validateCapture(paymentImage);
    }

    const formData = new FormData();
    formData.set("collectionMode", paymentMode);
    formData.set("collectedAmount", String(normalizedAmount));
    formData.set("notes", paymentNotes);
    formData.set("applyServiceAmountChange", String(applyServiceAmountChange));
    if (paymentImage) {
      formData.set("file", paymentImage);
    }

    const res = await fetch(`/api/groomer/bookings/${booking.id}/payment-proof${tokenQuery}`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error ?? "Payment save nahi ho paaya.");
    setPaymentImage(null);
    openMomentToast({
      action: "payment_saved",
    });
  };

  const claimGroomerIdentity = async () => {
    if (!selectedMemberId) {
      throw new Error(languageMode === "simple" ? "Pehle apna naam chuniye." : "पहले अपना नाम चुनिए।");
    }

    await postJson(`/api/groomer/bookings/${booking.id}/claim-member`, {
      teamMemberId: selectedMemberId,
    });
    openMomentToast({
      action: "claim_member",
    });
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8f5ff_0%,#efe9ff_100%)] px-3 py-3">
      <div className="mx-auto max-w-xl space-y-3">
        <div className="rounded-[30px] border border-[#eadffd] bg-white p-4 shadow-[0_18px_48px_rgba(73,44,120,0.08)]">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">All Tails Groomer Flow</div>
              <h1 className="mt-1 text-[28px] font-black tracking-[-0.03em] text-[#1f1f2c]">
                {languageMode === "simple" ? "Aaj ka kaam" : "आज का काम"}
              </h1>
            </div>

            <button
              type="button"
              onClick={() => setLanguageMode((prev) => (prev === "simple" ? "hindi" : "simple"))}
              className="shrink-0 rounded-[16px] border border-[#ddd1fb] bg-[#faf8ff] px-3 py-2 text-[12px] font-semibold text-[#5b4bc2]"
            >
              {languageMode === "simple" ? "हिंदी" : "Simple Hindi"}
            </button>
          </div>

          <div className="mt-4 rounded-[24px] bg-[linear-gradient(135deg,#6d5bd0_0%,#8b7be7_100%)] p-4 text-white">
            <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/75">
              {languageMode === "simple" ? "Booking" : "बुकिंग"}
            </div>
            <div className="mt-1 text-[22px] font-black tracking-[-0.03em]">{booking.service.name}</div>
            <div className="mt-1 text-[14px] text-white/85">
              {formatDate(booking.selectedDate, languageMode)}
              {booking.bookingWindow ? ` · ${booking.bookingWindow.label}` : ""}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-[18px] bg-white/12 px-3 py-3">
                <div className="text-[11px] uppercase tracking-[0.08em] text-white/70">
                  {languageMode === "simple" ? "Pet parent" : "पेट पैरेंट"}
                </div>
                <div className="mt-1 text-[14px] font-semibold">{booking.customer.name}</div>
                {customerCallHref ? (
                  <a
                    href={customerCallHref}
                    className="mt-1 inline-flex items-center rounded-[12px] border border-white/20 bg-white/10 px-2.5 py-1.5 text-[13px] font-semibold text-white/95 underline-offset-2 hover:bg-white/16 hover:underline"
                  >
                    {booking.customer.phone}
                  </a>
                ) : (
                  <div className="text-[13px] text-white/80">{booking.customer.phone}</div>
                )}
              </div>
              <div className="rounded-[18px] bg-white/12 px-3 py-3">
                <div className="text-[11px] uppercase tracking-[0.08em] text-white/70">
                  {languageMode === "simple" ? "Area / Team" : "एरिया / टीम"}
                </div>
                <div className="mt-1 text-[14px] font-semibold">{booking.customer.city ?? "—"}</div>
                <div className="text-[13px] text-white/80">{booking.team?.name ?? "Unassigned"}</div>
              </div>
            </div>

            {slaSecondsRemaining !== null ? (
              <div className="mt-3 rounded-[20px] bg-white/14 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/70">
                      {languageMode === "simple" ? "Service timer" : "सर्विस टाइमर"}
                    </div>
                    <div className="mt-1 text-[15px] font-semibold text-white">
                      {languageMode === "simple"
                        ? `${booking.service.sla?.label ?? booking.service.name} SLA`
                        : `${booking.service.sla?.label ?? booking.service.name} एसएलए`}
                    </div>
                    <div className="mt-1 text-[12px] text-white/75">
                      {languageMode === "simple"
                        ? `${booking.service.sla?.durationMinutes ?? 90} min ka target time`
                        : `${booking.service.sla?.durationMinutes ?? 90} मिनट का टार्गेट समय`}
                    </div>
                  </div>
                  <div className={`rounded-[16px] px-3 py-2 text-right ${getSlaStateColor(slaSecondsRemaining)} bg-white`}>
                    <div className="text-[11px] font-bold uppercase tracking-[0.08em]">
                      {slaSecondsRemaining > 0
                        ? (languageMode === "simple" ? "Time left" : "बाकी समय")
                        : (languageMode === "simple" ? "Over time" : "समय पार")}
                    </div>
                    <div className="mt-1 font-mono text-[20px] font-black tracking-[-0.03em]">
                      {formatTimer(Math.abs(slaSecondsRemaining))}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-[16px] bg-white/10 px-3 py-2 text-[12px] text-white/85">
                  <span>
                    {languageMode === "simple"
                      ? `Chalu hua: ${booking.bookingWindow?.label ?? "slot pending"}`
                      : `शुरू समय: ${booking.bookingWindow?.label ?? "स्लॉट बाकी"}`}
                  </span>
                  <span>
                    {languageMode === "simple"
                      ? `Elapsed: ${formatTimer(slaSecondsElapsed ?? 0)}`
                      : `बीता समय: ${formatTimer(slaSecondsElapsed ?? 0)}`}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void runAction("en_route", async () => {
                const data = await postJson(`/api/groomer/bookings/${booking.id}/dispatch-state`, { dispatchState: "en_route" });
                if (data?.rewardsDelta?.length) {
                  setRewardModal({
                    rewards: data.rewardsDelta,
                    summary: data.rewardSummary
                      ? {
                          teamMember: data.rewardSummary.teamMember,
                          totalXpAwarded: data.rewardSummary.totalXpAwarded,
                          totalRewardPointsAwarded: data.rewardSummary.totalRewardPointsAwarded,
                          prestigeCredits: data.rewardSummary.gamification?.prestigeCredits,
                        }
                      : null,
                  });
                }
                openMomentToast({
                  action: "en_route",
                  xpAwarded: Array.isArray(data?.rewardsDelta)
                    ? data.rewardsDelta.reduce((sum: number, reward: { xpAwarded?: number }) => sum + Number(reward?.xpAwarded ?? 0), 0)
                    : 0,
                  rewardCreditsAwarded: Array.isArray(data?.rewardsDelta)
                    ? data.rewardsDelta.reduce((sum: number, reward: { rewardPointsAwarded?: number }) => sum + Number(reward?.rewardPointsAwarded ?? 0), 0)
                    : 0,
                  prestigeCredits: data?.rewardSummary?.gamification?.prestigeCredits,
                });
              })}
              disabled={busy !== null || ["en_route", "started", "completed"].includes(booking.dispatchState)}
              className="rounded-[18px] bg-[#6d5bd0] px-4 py-4 text-[15px] font-semibold text-white disabled:opacity-50"
            >
              {busy === "en_route"
                ? languageMode === "simple" ? "Save ho raha hai..." : "सेव हो रहा है..."
                : languageMode === "simple" ? "Nikal gaye" : "निकल गए"}
            </button>
            <button
              type="button"
              onClick={() => void runAction("started", async () => {
                await postJson(`/api/groomer/bookings/${booking.id}/dispatch-state`, { dispatchState: "started" });
                openMomentToast({
                  action: "started",
                });
              })}
              disabled={busy !== null || ["started", "completed"].includes(booking.dispatchState)}
              className="rounded-[18px] border border-[#d8cff8] bg-white px-4 py-4 text-[15px] font-semibold text-[#5b4bc2] disabled:opacity-50"
            >
              {busy === "started"
                ? languageMode === "simple" ? "Save ho raha hai..." : "सेव हो रहा है..."
                : languageMode === "simple" ? "Pahunch gaye" : "पहुँच गए"}
            </button>
          </div>

          {(booking.availableTeamMembers?.length ?? 0) > 0 ? (
            <div className="mt-3 rounded-[20px] border border-[#ebe5fb] bg-[#fcfbff] p-4">
              <div className="text-[13px] font-semibold text-[#2a2346]">
                {languageMode === "simple" ? "Apna naam confirm karein" : "अपना नाम कन्फर्म करें"}
              </div>
              <div className="mt-1 text-[12px] leading-[1.6] text-[#6b7280]">
                {languageMode === "simple"
                  ? "Rewards aur booking history sahi naam par jaane ke liye apna naam chuniyega."
                  : "रिवॉर्ड और बुकिंग हिस्ट्री सही नाम पर जाने के लिए अपना नाम चुनिए।"}
              </div>
              <div className="mt-3 flex gap-2">
                <select
                  value={selectedMemberId}
                  onChange={(event) => setSelectedMemberId(event.target.value)}
                  className="h-[46px] min-w-0 flex-1 rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none"
                >
                  <option value="">{languageMode === "simple" ? "Naam chuniye" : "नाम चुनिए"}</option>
                  {(booking.availableTeamMembers ?? []).map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} · {member.currentRank}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void runAction("claim_member", claimGroomerIdentity)}
                  disabled={busy !== null || !selectedMemberId || booking.groomerMember?.id === selectedMemberId}
                  className="rounded-[14px] bg-[#2a2346] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
                >
                  {busy === "claim_member"
                    ? languageMode === "simple" ? "Save..." : "सेव..."
                    : languageMode === "simple" ? "Confirm" : "कन्फर्म"}
                </button>
              </div>
              {booking.groomerMember ? (
                <div className="mt-3 rounded-[14px] bg-white px-3 py-3 text-[12px] text-[#4b5563]">
                  {languageMode === "simple"
                    ? `Current: ${booking.groomerMember.name} · ${booking.groomerMember.currentRank} · ${booking.groomerMember.currentXp} XP`
                    : `अभी: ${booking.groomerMember.name} · ${booking.groomerMember.currentRank} · ${booking.groomerMember.currentXp} एक्सपी`}
                </div>
              ) : null}
            </div>
          ) : null}

          {booking.groomerMember ? (
            <Link
                href={`/groomer/home/${booking.groomerMember.id}?bookingId=${encodeURIComponent(booking.id)}${token ? `&token=${encodeURIComponent(token)}` : ""}`}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[18px] border border-[#ddd1fb] bg-[#faf8ff] px-4 py-4 text-[15px] font-semibold text-[#5b4bc2]"
            >
              {languageMode === "simple" ? "Mera home dekhein" : "मेरा होम देखें"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            <span className={`rounded-full px-3 py-1 text-[12px] font-semibold ${statusChipClass(booking.dispatchState)}`}>
              {formatStatus(booking.dispatchState, languageMode)}
            </span>
            <span className={`rounded-full px-3 py-1 text-[12px] font-semibold ${statusChipClass(booking.status)}`}>
              {formatStatus(booking.status, languageMode)}
            </span>
          </div>

          {booking.opsNote ? (
            <div className="mt-3 rounded-[20px] border border-[#ffd891] bg-[#fff8e8] px-4 py-3 text-[14px] text-[#7a5200]">
              <div className="font-black uppercase tracking-[0.06em] text-[#b45309]">
                {languageMode === "simple" ? "Important note" : "ज़रूरी नोट"}
              </div>
              <div className="mt-1 leading-[1.7]">{booking.opsNote}</div>
            </div>
          ) : null}

          <div
            className={`mt-3 rounded-[20px] border px-4 py-3 ${
              jobPsychology.tone === "warning"
                ? "border-[#f8d0d6] bg-[#fff3f5] text-[#9f1239]"
                : jobPsychology.tone === "celebrate"
                  ? "border-[#f8e2b7] bg-[#fff8eb] text-[#92400e]"
                  : jobPsychology.tone === "focus"
                    ? "border-[#ddd1fb] bg-[#f7f3ff] text-[#5b4bc2]"
                    : "border-[#dbeafe] bg-[#eff6ff] text-[#1d4ed8]"
            }`}
          >
            <div className="text-[12px] font-black uppercase tracking-[0.08em]">
              {languageMode === "simple" ? "Right now" : "अभी का फोकस"}
            </div>
            <div className="mt-1 text-[16px] font-black tracking-[-0.02em]">{jobPsychologyTitle}</div>
            <div className="mt-1 text-[13px] leading-[1.7]">{jobPsychology.detail}</div>
          </div>
        </div>

        <div className="rounded-[30px] border border-[#eadffd] bg-white p-4 shadow-[0_18px_48px_rgba(73,44,120,0.08)]">
          <SectionTitle
            eyebrow={languageMode === "simple" ? "Location" : "लोकेशन"}
            title={languageMode === "simple" ? "Address aur map" : "एड्रेस और मैप"}
            subtitle={languageMode === "simple" ? "Nikalne se pehle address check kar lein." : "निकलने से पहले एड्रेस चेक कर लें।"}
          />

          <div className="mt-3 rounded-[22px] border border-[#ebe5fb] bg-[#fcfbff] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-[15px] font-semibold text-[#2a2346]">{booking.addressInfo.statusLabel}</div>
              {mapsHref ? (
                <a
                  href={mapsHref}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-[14px] border border-[#ddd1fb] px-3 py-2 text-[13px] font-semibold text-[#6d5bd0]"
                >
                  <MapPinned className="mr-1 inline h-4 w-4" />
                  {languageMode === "simple" ? "Map kholo" : "मैप खोलें"}
                </a>
              ) : null}
            </div>
            {mapsHref ? (
              <a
                href={mapsHref}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block rounded-[18px] border border-[#ece5ff] bg-white px-3 py-3 text-[14px] leading-[1.7] text-[#4b5563] transition-colors hover:bg-[#f8f5ff]"
              >
                <div>{booking.addressInfo.serviceAddress ?? (languageMode === "simple" ? "Address abhi add nahi hua." : "एड्रेस अभी जोड़ा नहीं गया।")}</div>
                {booking.addressInfo.serviceLandmark ? <div>{languageMode === "simple" ? "Landmark" : "लैंडमार्क"}: {booking.addressInfo.serviceLandmark}</div> : null}
                {booking.addressInfo.servicePincode ? <div>{languageMode === "simple" ? "Pin code" : "पिन कोड"}: {booking.addressInfo.servicePincode}</div> : null}
                <div className="mt-2 text-[12px] font-semibold text-[#6d5bd0]">
                  {languageMode === "simple" ? "Tap karke Google Maps kholo" : "टैप करके गूगल मैप्स खोलें"}
                </div>
              </a>
            ) : (
              <div className="mt-3 space-y-1 text-[14px] leading-[1.7] text-[#4b5563]">
                <div>{booking.addressInfo.serviceAddress ?? (languageMode === "simple" ? "Address abhi add nahi hua." : "एड्रेस अभी जोड़ा नहीं गया।")}</div>
                {booking.addressInfo.serviceLandmark ? <div>{languageMode === "simple" ? "Landmark" : "लैंडमार्क"}: {booking.addressInfo.serviceLandmark}</div> : null}
                {booking.addressInfo.servicePincode ? <div>{languageMode === "simple" ? "Pin code" : "पिन कोड"}: {booking.addressInfo.servicePincode}</div> : null}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3 rounded-[30px] border border-[#eadffd] bg-white p-4 shadow-[0_18px_48px_rgba(73,44,120,0.08)]">
          <SectionTitle
            eyebrow={languageMode === "simple" ? "Pet details" : "पेट डिटेल्स"}
            title={languageMode === "simple" ? "Pet aur style" : "पेट और स्टाइल"}
            subtitle={languageMode === "simple" ? "Notes aur photos dekh kar hi cut karein." : "नोट्स और फोटो देखकर ही कट कीजिए।"}
          />

          {booking.pets.map((pet) => (
            <div key={pet.id} className="rounded-[24px] border border-[#ebe5fb] bg-[#fcfbff] p-4">
              <div className="flex items-start gap-3">
                {pet.avatarUrl ? (
                  <a href={pet.avatarUrl} target="_blank" rel="noreferrer" className="overflow-hidden rounded-[18px] border border-[#ece5ff] bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={pet.avatarUrl} alt={pet.name ?? "Pet"} className="h-[84px] w-[84px] object-cover" />
                  </a>
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="text-[18px] font-black tracking-[-0.02em] text-[#1f1f2c]">
                    {pet.name ?? (languageMode === "simple" ? "Unnamed pet" : "बिना नाम का पेट")}
                  </div>
                  <div className="mt-1 text-[14px] font-semibold text-[#6d5bd0]">{pet.breed}</div>
                </div>
              </div>

              {pet.groomingNotes ? (
                <div className="mt-4 rounded-[18px] border border-[#d9e7fb] bg-[#f4f8ff] px-4 py-3 text-[14px] leading-[1.7] text-[#23415a]">
                  <div className="font-semibold text-[#23415a]">{languageMode === "simple" ? "Grooming notes" : "ग्रूमिंग नोट्स"}</div>
                  <div className="mt-1">{pet.groomingNotes}</div>
                </div>
              ) : null}

              {pet.stylingNotes ? (
                <div className="mt-3 rounded-[18px] border border-[#f1dfff] bg-[#fcf7ff] px-4 py-3 text-[14px] leading-[1.7] text-[#5b3a76]">
                  <div className="font-semibold text-[#5b3a76]">{languageMode === "simple" ? "Style / look" : "स्टाइल / लुक"}</div>
                  <div className="mt-1">{pet.stylingNotes}</div>
                </div>
              ) : null}

              <div className="mt-4 space-y-4">
                <MediaStrip
                  title={languageMode === "simple" ? "Current coat / problem photos" : "करंट कोट / प्रॉब्लम फोटो"}
                  urls={pet.concernPhotoUrls}
                />
                <MediaStrip
                  title={languageMode === "simple" ? "Style reference photos" : "स्टाइल रेफरेंस फोटो"}
                  urls={pet.stylingReferenceUrls}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-[30px] border border-[#eadffd] bg-white p-4 shadow-[0_18px_48px_rgba(73,44,120,0.08)]">
          <SectionTitle
            eyebrow="SOP"
            title={languageMode === "simple" ? "Kaam ke steps" : "काम के स्टेप्स"}
            subtitle={languageMode === "simple" ? "Abhi jo step zaroori hai, wahi khula rahega. Video 10-15 second rakhein." : "अभी जो स्टेप ज़रूरी है, वही खुला रहेगा। वीडियो 10-15 सेकंड रखिए।"}
          />

          {petSettledStep ? (
            <div className="mt-3">
              <StepCard
                title={languageMode === "simple" ? petSettledStep.groomerLabel : petSettledStep.groomerLabelHindi}
                hint={languageMode === "simple" ? petSettledStep.groomerHint : petSettledStep.groomerHintHindi}
                done={petSettledStep.status === "completed"}
                completedAt={petSettledStep.completedAt}
                expanded={activeExpandedKey === petSettledStep.key}
                defaultIcon={<CheckCircle2 className="h-4 w-4" />}
                onToggle={() => setExpandedStepKey((prev) => (prev === petSettledStep.key ? null : petSettledStep.key))}
                mode={languageMode}
              >
                <button
                  type="button"
                  onClick={() => void runAction(petSettledStep.key, () =>
                    postJson(`/api/groomer/bookings/${booking.id}/sop/step`, {
                      stepKey: petSettledStep.key,
                      status: petSettledStep.status === "completed" ? "pending" : "completed",
                    })
                  )}
                  disabled={busy !== null}
                  className={`w-full rounded-[18px] px-4 py-4 text-[15px] font-semibold disabled:opacity-50 ${petSettledStep.status === "completed" ? "border border-[#16a34a] bg-white text-[#15803d]" : "bg-[#16a34a] text-white"}`}
                >
                  {busy === petSettledStep.key
                    ? languageMode === "simple" ? "Save ho raha hai..." : "सेव हो रहा है..."
                    : petSettledStep.status === "completed"
                      ? languageMode === "simple" ? "Step ho gaya" : "स्टेप हो गया"
                      : languageMode === "simple" ? "Pet shaant ho gaya" : "पेट शांत हो गया"}
                </button>
              </StepCard>
            </div>
          ) : null}

          <div className="mt-3 space-y-3">
            {mediaSteps.map((step) => (
              <StepCard
                key={step.key}
                title={languageMode === "simple" ? step.groomerLabel : step.groomerLabelHindi}
                hint={languageMode === "simple" ? step.groomerHint : step.groomerHintHindi}
                done={step.status === "completed"}
                completedAt={step.completedAt}
                expanded={activeExpandedKey === step.key}
                defaultIcon={
                  step.proofType === "video"
                    ? <Video className="h-4 w-4" />
                    : step.proofType === "image"
                      ? <Camera className="h-4 w-4" />
                      : <Scissors className="h-4 w-4" />
                }
                onToggle={() => setExpandedStepKey((prev) => (prev === step.key ? null : step.key))}
                mode={languageMode}
              >
                <div className="flex flex-wrap gap-2">
                  {step.proofType === "video" ? (
                    <ActionButton
                      label={languageMode === "simple" ? "Video record karein" : "वीडियो रिकॉर्ड करें"}
                      tone="primary"
                      icon={<Video className="h-4 w-4" />}
                      disabled={busy !== null}
                      onClick={() => void openLiveVideoRecorder(step.key).catch((error: unknown) => {
                        setModalError(error instanceof Error ? error.message : "Camera khul nahi paaya.");
                      })}
                    />
                  ) : null}

                  {step.proofType === "image" ? (
                    <CaptureButton
                      label={languageMode === "simple" ? "Camera se photo" : "कैमरा से फोटो"}
                      accept="image/*"
                      capture="environment"
                      tone="primary"
                      icon={<Camera className="h-4 w-4" />}
                      disabled={busy !== null}
                      onPick={(file) => void runAction(step.key, () => uploadStepMedia(step.key, file))}
                    />
                  ) : null}

                  {step.proofType === "mixed" ? (
                    <>
                      <CaptureButton
                        label={languageMode === "simple" ? "Photo kheecho" : "फोटो खींचो"}
                        accept="image/*"
                        capture="environment"
                        tone="primary"
                        icon={<Camera className="h-4 w-4" />}
                        disabled={busy !== null}
                        onPick={(file) => void runAction(step.key, () => uploadStepMedia(step.key, file))}
                      />
                      <ActionButton
                        label={languageMode === "simple" ? "Video banao" : "वीडियो बनाओ"}
                        icon={<Video className="h-4 w-4" />}
                        disabled={busy !== null}
                        onClick={() => void openLiveVideoRecorder(step.key).catch((error: unknown) => {
                          setModalError(error instanceof Error ? error.message : "Camera khul nahi paaya.");
                        })}
                      />
                    </>
                  ) : null}
                </div>

                {step.proofs.length ? (
                  <div className="mt-3 space-y-2">
                    {step.proofs.map((proof) => (
                      <a
                        key={proof.id}
                        href={proof.publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between rounded-[14px] border border-[#ece5ff] bg-white px-3 py-3 text-[13px] text-[#2a2346]"
                      >
                        <span>{proof.originalName}</span>
                        <span className="font-semibold text-[#6d5bd0]">{languageMode === "simple" ? "Kholo" : "खोलो"}</span>
                      </a>
                    ))}
                  </div>
                ) : null}
              </StepCard>
            ))}
          </div>
        </div>

        <div className="rounded-[30px] border border-[#eadffd] bg-white p-4 shadow-[0_18px_48px_rgba(73,44,120,0.08)]">
          <SectionTitle
            eyebrow={languageMode === "simple" ? "Payment" : "पेमेंट"}
            title={languageMode === "simple" ? "Payment details" : "पेमेंट डिटेल्स"}
            subtitle={languageMode === "simple" ? "Jo payment mila ho, amount aur image yahan save karein." : "जो पेमेंट मिला हो, अमाउंट और इमेज यहाँ सेव कीजिए।"}
          />

          <div className="mt-3 grid gap-3">
            <select
              value={paymentMode}
              onChange={(event) => setPaymentMode(event.target.value as "cash" | "online" | "waived")}
              className="h-[50px] rounded-[18px] border border-[#ddd1fb] px-4 text-[14px] outline-none"
            >
              <option value="cash">{tx(languageMode, PAYMENT_MODE_LABELS.cash)}</option>
              <option value="online">{tx(languageMode, PAYMENT_MODE_LABELS.online)}</option>
              <option value="waived">{tx(languageMode, PAYMENT_MODE_LABELS.waived)}</option>
            </select>

            <input
              type="number"
              min="0"
              value={paymentAmount}
              onChange={(event) => setPaymentAmount(event.target.value)}
              className="h-[50px] rounded-[18px] border border-[#ddd1fb] px-4 text-[14px] outline-none"
              placeholder={languageMode === "simple" ? "Kitna amount mila" : "कितना अमाउंट मिला"}
            />

            <textarea
              rows={2}
              value={paymentNotes}
              onChange={(event) => setPaymentNotes(event.target.value)}
              className="rounded-[18px] border border-[#ddd1fb] px-4 py-3 text-[14px] outline-none"
              placeholder={languageMode === "simple" ? "Chhota note likhein" : "छोटा नोट लिखिए"}
            />

            <label className="rounded-[18px] border border-[#ebe5fb] bg-[#fcfbff] px-4 py-3 text-[14px] text-[#4b5563]">
              <span className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={applyServiceAmountChange}
                  onChange={(event) => setApplyServiceAmountChange(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-[#d8cff8] text-[#6d5bd0] focus:ring-[#c4b5fd]"
                />
                <span>
                  <span className="block font-semibold text-[#2a2346]">
                    {languageMode === "simple" ? "Customer ne plan change kiya?" : "कस्टमर ने प्लान बदला?"}
                  </span>
                  <span className="mt-1 block text-[12px] leading-[1.6] text-[#6b7280]">
                    {languageMode === "simple"
                      ? "Isko on karein jab service upgrade ya downgrade final ho gaya ho. Is amount ko booking ka naya final amount maana jayega."
                      : "इसे ऑन करें जब सर्विस अपग्रेड या डाउनग्रेड फाइनल हो गया हो। यह अमाउंट बुकिंग का नया फाइनल अमाउंट माना जाएगा।"}
                  </span>
                </span>
              </span>
            </label>

            {paymentMode !== "waived" ? (
              <StepCard
                title={languageMode === "simple" ? "Payment image" : "पेमेंट इमेज"}
                hint={languageMode === "simple" ? "Cash ho to photo, online ho to screenshot add karein." : "कैश हो तो फोटो, ऑनलाइन हो तो स्क्रीनशॉट जोड़िए।"}
                done={!!paymentStep?.proofs.length}
                completedAt={paymentStep?.completedAt ?? null}
                expanded={activeExpandedKey === "payment_proof"}
                defaultIcon={<IndianRupee className="h-4 w-4" />}
                onToggle={() => setExpandedStepKey((prev) => (prev === "payment_proof" ? null : "payment_proof"))}
                mode={languageMode}
              >
                <div className="flex flex-wrap gap-2">
                  <CaptureButton
                    label={languageMode === "simple" ? "Camera se photo" : "कैमरा से फोटो"}
                    accept="image/*"
                    capture="environment"
                    tone="primary"
                    icon={<Camera className="h-4 w-4" />}
                    disabled={busy !== null}
                    onPick={(file) => setPaymentImage(file)}
                  />
                </div>

                {paymentImage ? (
                  <div className="mt-3 rounded-[14px] bg-white px-3 py-3 text-[13px] text-[#4b5563]">
                    {languageMode === "simple" ? "Selected" : "चुना गया"}: {paymentImage.name}
                  </div>
                ) : null}
              </StepCard>
            ) : null}

            <button
              type="button"
              onClick={() => void runAction("payment", savePayment)}
              disabled={busy !== null}
              className="rounded-[18px] bg-[#149c6d] px-4 py-4 text-[15px] font-semibold text-white disabled:opacity-50"
            >
              {busy === "payment"
                ? languageMode === "simple" ? "Save ho raha hai..." : "सेव हो रहा है..."
                : languageMode === "simple" ? "Payment save karein" : "पेमेंट सेव करें"}
            </button>

            {booking.payment.collection ? (
              <div className={`rounded-[18px] px-4 py-3 text-[14px] leading-[1.7] ${booking.payment.collection.mismatchFlag ? "bg-[#fff1f2] text-[#be123c]" : "bg-[#effaf3] text-[#15803d]"}`}>
                {booking.payment.collection.serviceAmountUpdated
                  ? (languageMode === "simple"
                    ? `${booking.payment.collection.serviceAmountDirection === "upsell" ? "Upsell" : "Downgrade"} save ho gaya: ₹${booking.payment.collection.expectedAmount} se ₹${booking.payment.collection.collectedAmount}.`
                    : `${booking.payment.collection.serviceAmountDirection === "upsell" ? "अपसेल" : "डाउनग्रेड"} सेव हो गया: ₹${booking.payment.collection.expectedAmount} से ₹${booking.payment.collection.collectedAmount}।`)
                  : booking.payment.collection.mismatchFlag
                  ? (languageMode === "simple"
                    ? `Mismatch hai: ₹${booking.payment.collection.collectedAmount} mila, expected ₹${booking.payment.collection.expectedAmount}.`
                    : `मिसमैच है: ₹${booking.payment.collection.collectedAmount} मिला, एक्सपेक्टेड ₹${booking.payment.collection.expectedAmount}।`)
                  : (languageMode === "simple"
                    ? `${tx(languageMode, PAYMENT_MODE_LABELS[booking.payment.collection.collectionMode as "cash" | "online" | "waived"])} payment ₹${booking.payment.collection.collectedAmount} save ho gaya.`
                    : `${tx(languageMode, PAYMENT_MODE_LABELS[booking.payment.collection.collectionMode as "cash" | "online" | "waived"])} पेमेंट ₹${booking.payment.collection.collectedAmount} सेव हो गया।`)}
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-[30px] border border-[#eadffd] bg-white p-4 shadow-[0_18px_48px_rgba(73,44,120,0.08)]">
          <SectionTitle
            eyebrow={languageMode === "simple" ? "Finish" : "फिनिश"}
            title={languageMode === "simple" ? "Kaam complete karein" : "काम पूरा करें"}
            subtitle={languageMode === "simple" ? "Complete karne ke baad customer ko post-care message jayega." : "पूरा करने के बाद कस्टमर को पोस्ट-केयर मैसेज जाएगा।"}
          />

          <button
            type="button"
            onClick={() => void runAction("complete", async () => {
              const res = await fetch(`/api/groomer/bookings/${booking.id}/complete${tokenQuery}`, {
                method: "POST",
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error(data?.error ?? "Booking complete nahi ho paayi.");
              setRewardModal({
                rewards: data?.rewardsDelta ?? [],
                summary: data?.rewardSummary
                  ? {
                      teamMember: data.rewardSummary.teamMember,
                      totalXpAwarded: data.rewardSummary.totalXpAwarded,
                      totalRewardPointsAwarded: data.rewardSummary.totalRewardPointsAwarded,
                      prestigeCredits: data.rewardSummary.gamification?.prestigeCredits,
                    }
                  : null,
              });
              openMomentToast({
                action: "complete",
                xpAwarded: Array.isArray(data?.rewardsDelta)
                  ? data.rewardsDelta.reduce((sum: number, reward: { xpAwarded?: number }) => sum + Number(reward?.xpAwarded ?? 0), 0)
                  : 0,
                rewardCreditsAwarded: Array.isArray(data?.rewardsDelta)
                  ? data.rewardsDelta.reduce((sum: number, reward: { rewardPointsAwarded?: number }) => sum + Number(reward?.rewardPointsAwarded ?? 0), 0)
                  : 0,
                prestigeCredits: data?.rewardSummary?.gamification?.prestigeCredits,
              });
            })}
            disabled={busy !== null || booking.status === "completed"}
            className="mt-3 w-full rounded-[20px] bg-[#6d5bd0] px-4 py-4 text-[16px] font-semibold text-white disabled:opacity-50"
          >
            {busy === "complete"
              ? languageMode === "simple" ? "Complete ho raha hai..." : "पूरा हो रहा है..."
              : booking.status === "completed"
                ? languageMode === "simple" ? "Booking complete" : "बुकिंग पूरी"
                : languageMode === "simple" ? "Booking complete karein" : "बुकिंग पूरी करें"}
          </button>
        </div>
      </div>

      {modalError ? (
        <ErrorModal
          message={modalError}
          onClose={() => setModalError("")}
          mode={languageMode}
        />
      ) : null}

      {activeVideoStepKey ? (
        <LiveVideoRecorderModal
          mode={languageMode}
          busy={busy !== null}
          elapsedSeconds={recordingSeconds}
          isRecording={isRecordingVideo}
          hasRecordedFile={!!recordedVideoFile}
          videoRef={liveVideoRef}
          onStart={() => {
            try {
              startLiveRecording();
            } catch (error) {
              setModalError(error instanceof Error ? error.message : "Recording start nahi hui.");
            }
          }}
          onStop={stopLiveRecording}
          onUseRecording={() => {
            if (!activeVideoStepKey || !recordedVideoFile) return;
            void runAction(activeVideoStepKey, async () => {
              await uploadStepMedia(activeVideoStepKey, recordedVideoFile, {
                skipClientValidation: true,
              });
              closeLiveVideoRecorder();
            });
          }}
          onRetake={() => void retakeLiveRecording()}
          onClose={closeLiveVideoRecorder}
        />
      ) : null}

      {rewardModal ? (
        <RewardModal
          rewards={rewardModal.rewards}
          summary={rewardModal.summary}
          onClose={() => setRewardModal(null)}
          mode={languageMode}
        />
      ) : null}

      {momentToast ? (
        <div className="fixed inset-x-0 bottom-4 z-[310] mx-auto w-[calc(100%-24px)] max-w-md">
          <div
            className={`rounded-[24px] border px-4 py-4 shadow-[0_18px_40px_rgba(20,14,35,0.16)] ${
              momentToast.tone === "celebrate"
                ? "border-[#f8e2b7] bg-[#fff9eb]"
                : momentToast.tone === "warning"
                  ? "border-[#f8d0d6] bg-[#fff3f5]"
                  : momentToast.tone === "focus"
                    ? "border-[#ddd1fb] bg-[#f7f3ff]"
                    : "border-[#dbeafe] bg-[#eff6ff]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[16px] font-black tracking-[-0.02em] text-[#241f38]">{momentToast.title}</div>
                <div className="mt-1 text-[13px] leading-[1.7] text-[#5f5871]">{momentToast.detail}</div>
              </div>
              <button
                type="button"
                onClick={() => setMomentToast(null)}
                className="rounded-full border border-[#ddd1fb] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#6d5bd0]"
              >
                {languageMode === "simple" ? "Close" : "बंद"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
