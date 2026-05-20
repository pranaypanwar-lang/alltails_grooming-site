"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Heart,
  IndianRupee,
  MapPinned,
  Scissors,
  ShieldAlert,
  Video,
  Wind,
} from "lucide-react";
import type { GroomerBookingView } from "../../../../lib/groomerPortal";
import { resolveNote } from "../../../../lib/noteUtils";
import { deriveActionMoment, deriveJobFlowPsychology, resolvePsychologyText } from "../../../../lib/groomerPsychology";
import { getPacerPhases } from "../../../../lib/booking/pacerPhases";
import { useOfflineQueue } from "./hooks/useOfflineQueue";
import { useSessionState } from "./hooks/useSessionState";
import { FuelApprovalSheet } from "./components/FuelApprovalSheet";
import { PacerPhaseCard } from "./components/PacerPhaseCard";
import { PaymentPhaseCard } from "./components/PaymentPhaseCard";
import { LandingView } from "./components/LandingView";
import { SessionStartModal } from "./components/SessionStartModal";
import { SOPListReview } from "./components/SOPListReview";

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

const GROOMER_PAYMENT_QR_URL = "/images/groomer/payment-qr.jpg";
const GROOMER_GOOGLE_REVIEW_QR_URL = "/images/groomer/google-review-qr.png";

type GroomerTemperament = "calm" | "anxious" | "can_bite";

type GroomerTemperamentInfo = {
  key: GroomerTemperament;
  label: TextValue;
  briefing: TextValue;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  Icon: typeof Heart;
};

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1600;

function fileExtension(file: File) {
  return file.name.split(".").pop()?.toLowerCase() ?? "";
}

function isImageFile(file: File) {
  const extension = fileExtension(file);
  return file.type.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "heic", "heif"].includes(extension);
}

function isVideoFile(file: File) {
  const extension = fileExtension(file);
  return file.type.startsWith("video/") || ["mp4", "mov", "webm", "m4v"].includes(extension);
}

async function compressImageForUpload(file: File) {
  if (!isImageFile(file) || file.size <= MAX_UPLOAD_BYTES) return file;
  if (typeof document === "undefined") return file;

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Photo compress nahi ho paayi. Camera se fresh photo try karein."));
      img.src = objectUrl;
    });

    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.72));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

const GROOMER_TEMPERAMENT: Record<GroomerTemperament, GroomerTemperamentInfo> = {
  calm: {
    key: "calm",
    label: { simple: "Calm pet", hindi: "शांत पेट" },
    briefing: {
      simple: "Calm pet — extra time on finish and styling.",
      hindi: "शांत पेट — फिनिश और स्टाइलिंग पर समय लीजिए।",
    },
    badgeBg: "bg-[#eaf7f1]",
    badgeText: "text-[#11724f]",
    badgeBorder: "border-[#bfe5d4]",
    Icon: Heart,
  },
  anxious: {
    key: "anxious",
    label: { simple: "Anxious pet", hindi: "घबराया हुआ पेट" },
    briefing: {
      simple: "Anxious pet — befriend before starting; go slow.",
      hindi: "घबराया हुआ पेट — पहले दोस्ती बनाइए, फिर धीरे शुरू करें।",
    },
    badgeBg: "bg-[#fff7e8]",
    badgeText: "text-[#9a5a18]",
    badgeBorder: "border-[#f1d8a8]",
    Icon: Wind,
  },
  can_bite: {
    key: "can_bite",
    label: { simple: "Can bite — safety first", hindi: "काट सकता है — सुरक्षा पहले" },
    briefing: {
      simple: "Can bite — ask the parent for help with a muzzle. Safety first; proceed gently.",
      hindi: "काट सकता है — पेट पैरेंट से मज़ल लगवाने में मदद लीजिए। सुरक्षा पहले, धीरे काम करें।",
    },
    badgeBg: "bg-[#fff0f0]",
    badgeText: "text-[#a44747]",
    badgeBorder: "border-[#f0c7c7]",
    Icon: ShieldAlert,
  },
};

const TEMPERAMENT_KEY_FROM_RAW: Record<string, GroomerTemperament> = {
  sweet_soul: "calm",
  calm: "calm",
  wiggle_worrier: "anxious",
  anxious: "anxious",
  spicy_spark: "can_bite",
  can_bite: "can_bite",
  "can bite": "can_bite",
};

function extractTemperament(notes: string | null | undefined): {
  info: GroomerTemperamentInfo | null;
  cleanedNotes: string;
} {
  if (!notes) return { info: null, cleanedNotes: "" };
  const lines = notes.split(/\r?\n/);
  let foundKey: GroomerTemperament | null = null;
  const remaining: string[] = [];
  for (const line of lines) {
    const match = line.match(/^\s*\[?\s*Temperament\s*[:\-]\s*([^\]]+?)\s*\]?\s*$/i);
    if (match && !foundKey) {
      const raw = match[1].trim().toLowerCase().replace(/\s+/g, "_");
      const key = TEMPERAMENT_KEY_FROM_RAW[raw] ?? TEMPERAMENT_KEY_FROM_RAW[match[1].trim().toLowerCase()];
      if (key) {
        foundKey = key;
        continue;
      }
    }
    remaining.push(line);
  }
  return {
    info: foundKey ? GROOMER_TEMPERAMENT[foundKey] : null,
    cleanedNotes: remaining.join("\n").trim(),
  };
}

function resolveTemperamentInfo(value: string | null | undefined) {
  if (!value) return null;
  const raw = value.trim().toLowerCase();
  const key = TEMPERAMENT_KEY_FROM_RAW[raw.replace(/\s+/g, "_")] ?? TEMPERAMENT_KEY_FROM_RAW[raw];
  return key ? GROOMER_TEMPERAMENT[key] : null;
}

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
  if (isVideoFile(file)) {
    const duration = await getVideoDuration(file);
    if (duration > 15.5) {
      throw new Error("Video 10-15 second ke andar rakhein.");
    }
  }

  if (isImageFile(file) && file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Photo upload ke liye heavy hai. Camera se ek fresh photo try karein.");
  }

  if (isVideoFile(file) && file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Video heavy ho gaya. 10 second ka short video dobara record karein.");
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

function GroomerQrCard({
  title,
  hint,
  src,
  alt,
}: {
  title: string;
  hint: string;
  src: string;
  alt: string;
}) {
  return (
    <a
      href={src}
      target="_blank"
      rel="noreferrer"
      className="flex min-w-0 items-center gap-3 rounded-[20px] border border-[#eadffd] bg-[#fbf9ff] p-3"
    >
      <span className="flex h-[104px] w-[104px] shrink-0 items-center justify-center overflow-hidden rounded-[18px] border border-[#e7ddff] bg-white p-2 shadow-[0_10px_22px_rgba(73,44,120,0.08)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="h-full w-full object-contain" />
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-black leading-tight text-[#2a2346]">{title}</span>
        <span className="mt-1 block text-[12px] leading-[1.55] text-[#6b7280]">{hint}</span>
        <span className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-bold text-[#6d5bd0]">
          Tap to open
        </span>
      </span>
    </a>
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
  videoRef: React.RefObject<HTMLVideoElement | null> | ((el: HTMLVideoElement | null) => void);
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
  isPreview = false,
}: {
  initialBooking: GroomerBookingView;
  token?: string;
  isPreview?: boolean;
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
  const [showSessionStartModal, setShowSessionStartModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  // Holds a stream that arrived before the video element mounted; the callback ref drains it
  const pendingStreamRef = useRef<MediaStream | null>(null);
  // Callback ref: attaches any pending stream the moment the <video> element mounts
  const videoCallbackRef = useCallback((el: HTMLVideoElement | null) => {
    liveVideoRef.current = el;
    if (el && pendingStreamRef.current) {
      el.srcObject = pendingStreamRef.current;
      el.muted = true;
      void el.play().catch(() => undefined);
      pendingStreamRef.current = null;
    }
  }, []);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedBlobUrlRef = useRef<string | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : "";

  const { stepSyncMap, queueUpload, runSync } = useOfflineQueue(booking.id, tokenQuery);
  const { sessionState, isHydrated, initializeSession, updateStatus, completeStep, clearSession } = useSessionState(booking.id);

  // Initialize session when first arriving
  useEffect(() => {
    if (!isHydrated) return;
    if (sessionState) return;
    if (booking.dispatchState !== "started") return;
    initializeSession();
  }, [isHydrated, sessionState, booking.dispatchState, initializeSession]);

  // Pacer state — activate once groomer has arrived (fuel confirmed)
  const pacerStorageKey = `pacer-phase-${booking.id}`;
  const [pacerMode, setPacerMode] = useState(booking.dispatchState === "started");
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(() => {
    if (booking.dispatchState !== "started") return 0;
    try {
      const saved = localStorage.getItem(pacerStorageKey);
      return saved ? parseInt(saved, 10) || 0 : 0;
    } catch { return 0; }
  });
  const pacerPhaseStartKey = `pacer-phase-start-${booking.id}`;
  const [pacerPhaseStartAt, setPacerPhaseStartAt] = useState<number | null>(() => {
    if (booking.dispatchState !== "started") return null;
    try {
      const saved = localStorage.getItem(`pacer-phase-start-${booking.id}`);
      return saved ? parseInt(saved, 10) : Date.now();
    } catch { return Date.now(); }
  });
  const [showFuelSheet, setShowFuelSheet] = useState(false);
  const [arrivedGps, setArrivedGps] = useState<{ lat: number; lng: number } | null>(null);

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

  // Persist pacer phase to localStorage so it survives page reloads mid-session
  useEffect(() => {
    if (!pacerMode) return;
    try { localStorage.setItem(pacerStorageKey, String(currentPhaseIndex)); } catch { /* ignore */ }
  }, [currentPhaseIndex, pacerMode, pacerStorageKey]);

  // Persist phase start time so the timer continues after phone close/reopen
  useEffect(() => {
    if (!pacerMode || pacerPhaseStartAt === null) return;
    try { localStorage.setItem(pacerPhaseStartKey, String(pacerPhaseStartAt)); } catch { /* ignore */ }
  }, [pacerPhaseStartAt, pacerMode, pacerPhaseStartKey]);

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
  // Countdown to slot start — shown while groomer has not yet arrived
  const preArrivalSecondsRemaining = slaStartAt && !["started", "completed"].includes(booking.dispatchState)
    ? Math.round((slaStartAt - now) / 1000)
    : null;
  const completedRequiredStepCount = booking.sopSteps.filter((step) => step.requiredForCompletion && step.status === "completed").length;
  const totalRequiredStepCount = booking.sopSteps.filter((step) => step.requiredForCompletion).length;
  const reviewCompleted = booking.sopSteps.find((step) => step.key === "review_proof")?.status === "completed";

  const pacerPhases = useMemo(() => getPacerPhases(booking.service.name), [booking.service.name]);
  const safePhaseIndex = Math.min(currentPhaseIndex, pacerPhases.length - 1);
  const currentPhase = pacerPhases[safePhaseIndex]!;
  const isLastPacerPhase = safePhaseIndex === pacerPhases.length - 1;
  const phaseTotalSeconds = currentPhase.durationMinutes * 60;
  const phaseSecondsElapsed = pacerPhaseStartAt ? Math.max(0, Math.round((now - pacerPhaseStartAt) / 1000)) : 0;
  const phaseSecondsRemaining = phaseTotalSeconds - phaseSecondsElapsed;
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

  // Completion popup logic
  const allSopDone = useMemo(() => {
    const required = booking.sopSteps.filter(
      (s) => !["payment_proof", "review_proof", "en_route", "arrived"].includes(s.key) && s.requiredForCompletion
    );
    return required.every((s) => s.status === "completed" || s.status === "skipped");
  }, [booking.sopSteps]);

  const paymentSaved = !!booking.payment.collection;

  useEffect(() => {
    if (allSopDone && paymentSaved && booking.status !== "completed") {
      setShowCompleteModal(true);
    }
  }, [allSopDone, paymentSaved, booking.status]);

  const cleanupLiveRecorder = () => {
    pendingStreamRef.current?.getTracks().forEach((track) => track.stop());
    pendingStreamRef.current = null;
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

    // Try rear camera first; fall back to any camera (handles iOS & devices without environment cam)
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 854, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 15, max: 20 },
        },
        audio: true,
      });
    } catch {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    }
    mediaStreamRef.current = stream;

    if (liveVideoRef.current) {
      // Video element already mounted (retake path or flushSync succeeded)
      liveVideoRef.current.srcObject = stream;
      liveVideoRef.current.muted = true;
      await liveVideoRef.current.play().catch(() => undefined);
    } else {
      // Video element not yet mounted — callback ref will attach stream on mount
      pendingStreamRef.current = stream;
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
      ? new MediaRecorder(stream, {
          mimeType: supportedMimeType,
          videoBitsPerSecond: 650_000,
          audioBitsPerSecond: 32_000,
        })
      : new MediaRecorder(stream, {
          videoBitsPerSecond: 650_000,
          audioBitsPerSecond: 32_000,
        });

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
    if (isPreview) {
      setModalError("Preview mode — yahan click se kuch nahi hoga. Real booking par hi kaam karega.");
      return;
    }
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
    const uploadFile = isImageFile(file) ? await compressImageForUpload(file) : file;
    if (!options?.skipClientValidation || uploadFile.size > MAX_UPLOAD_BYTES) {
      await validateCapture(uploadFile);
    }

    const formData = new FormData();
    formData.set("stepKey", stepKey);
    formData.set("file", uploadFile, uploadFile.name);

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

  const uploadOrQueue = async (stepKey: string, file: File, options?: { skipClientValidation?: boolean }) => {
    try {
      await uploadStepMedia(stepKey, file, options);
    } catch (err) {
      if (!navigator.onLine) {
        await queueUpload(stepKey, file);
      } else {
        throw err;
      }
    }
  };

  const executeSavePayment = async (
    mode: "cash" | "online" | "waived",
    amount: number,
    notes: string,
    image: File | null,
    applyChange: boolean
  ) => {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error(languageMode === "simple"
        ? "Valid amount daaliye."
        : "सही अमाउंट डालिए।");
    }
    if (applyChange && !notes.trim()) {
      throw new Error(languageMode === "simple"
        ? "Upgrade ya downgrade ka short note likhna zaroori hai."
        : "अपग्रेड या डाउनग्रेड का छोटा नोट लिखना ज़रूरी है।");
    }
    if (mode !== "waived" && !image && !booking.payment.collection) {
      throw new Error(languageMode === "simple"
        ? "Payment ke saath photo ya screenshot zaroor add karein."
        : "पेमेंट के साथ फोटो या स्क्रीनशॉट ज़रूर जोड़िए।");
    }
    const uploadPaymentImage = image ? await compressImageForUpload(image) : null;
    if (uploadPaymentImage) {
      await validateCapture(uploadPaymentImage);
    }
    const formData = new FormData();
    formData.set("collectionMode", mode);
    formData.set("collectedAmount", String(amount));
    formData.set("notes", notes);
    formData.set("applyServiceAmountChange", String(applyChange));
    if (uploadPaymentImage) {
      formData.set("file", uploadPaymentImage, uploadPaymentImage.name);
    }
    const res = await fetch(`/api/groomer/bookings/${booking.id}/payment-proof${tokenQuery}`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error ?? "Payment save nahi ho paaya.");
    setPaymentImage(null);
    openMomentToast({ action: "payment_saved" });
  };

  const savePayment = async () => {
    await executeSavePayment(
      paymentMode,
      Number(paymentAmount),
      paymentNotes,
      paymentImage,
      applyServiceAmountChange
    );
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

  // Shared overlay elements used across all views
  const fuelSheetOverlay = showFuelSheet ? (
    <FuelApprovalSheet
      mode={languageMode}
      bookingId={booking.id}
      tokenQuery={tokenQuery}
      enRouteLat={booking.enRouteLat}
      enRouteLng={booking.enRouteLng}
      arrivedLat={arrivedGps?.lat ?? null}
      arrivedLng={arrivedGps?.lng ?? null}
      onConfirmed={async () => {
        setShowFuelSheet(false);
        await refresh();
        setPacerMode(true);
        setPacerPhaseStartAt(Date.now());
        setCurrentPhaseIndex(0);
        try { localStorage.removeItem(pacerStorageKey); } catch { /* ignore */ }
      }}
      onError={(msg) => {
        setShowFuelSheet(false);
        setModalError(msg);
      }}
    />
  ) : null;

  const errorOverlay = modalError ? (
    <ErrorModal message={modalError} onClose={() => setModalError("")} mode={languageMode} />
  ) : null;

  const videoOverlay = activeVideoStepKey ? (
    <LiveVideoRecorderModal
      mode={languageMode}
      busy={busy !== null}
      elapsedSeconds={recordingSeconds}
      isRecording={isRecordingVideo}
      hasRecordedFile={!!recordedVideoFile}
      videoRef={videoCallbackRef}
      onStart={() => {
        try { startLiveRecording(); } catch (error) {
          setModalError(error instanceof Error ? error.message : "Recording start nahi hui.");
        }
      }}
      onStop={stopLiveRecording}
      onUseRecording={() => {
        if (!activeVideoStepKey || !recordedVideoFile) return;
        void runAction(activeVideoStepKey, async () => {
          await uploadOrQueue(activeVideoStepKey, recordedVideoFile, { skipClientValidation: true });
          closeLiveVideoRecorder();
        });
      }}
      onRetake={() => void retakeLiveRecording()}
      onClose={closeLiveVideoRecorder}
    />
  ) : null;

  const rewardOverlay = rewardModal ? (
    <RewardModal
      rewards={rewardModal.rewards}
      summary={rewardModal.summary}
      onClose={() => setRewardModal(null)}
      mode={languageMode}
    />
  ) : null;

  const toastOverlay = momentToast ? (
    <div className="fixed inset-x-0 bottom-4 z-[310] mx-auto w-[calc(100%-24px)] max-w-md">
      <div className={`rounded-[24px] border px-4 py-4 shadow-[0_18px_40px_rgba(20,14,35,0.16)] ${
        momentToast.tone === "celebrate" ? "border-[#f8e2b7] bg-[#fff9eb]"
          : momentToast.tone === "warning" ? "border-[#f8d0d6] bg-[#fff3f5]"
          : momentToast.tone === "focus" ? "border-[#ddd1fb] bg-[#f7f3ff]"
          : "border-[#dbeafe] bg-[#eff6ff]"
      }`}>
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
  ) : null;

  // Language toggle button used in pacer and fallback views
  const langToggle = (
    <button
      type="button"
      onClick={() => setLanguageMode((prev) => (prev === "simple" ? "hindi" : "simple"))}
      className="absolute right-4 top-4 z-10 rounded-[14px] border border-white/20 bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-white/70"
    >
      {languageMode === "simple" ? "हिंदी" : "Simple"}
    </button>
  );

  // ── VIEW 1: Pacer mode — full screen, nothing else visible ──
  if (pacerMode) {
    return (
      <div className="relative min-h-screen bg-[#0e0c22] px-3 py-3">
        {langToggle}
        <div className="mx-auto max-w-xl space-y-3 pt-2">
          {isLastPacerPhase ? (
            <PaymentPhaseCard
              mode={languageMode}
              booking={booking}
              busy={busy}
              onSave={async (collectionMode, amount, notes, image, applyServiceAmountChange) => {
                await executeSavePayment(collectionMode, amount, notes, image, applyServiceAmountChange);
                await refresh();
              }}
              onComplete={() => void runAction("complete", async () => {
                const res = await fetch(`/api/groomer/bookings/${booking.id}/complete${tokenQuery}`, { method: "POST" });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data?.error ?? "Booking complete nahi ho paayi.");
                setRewardModal({
                  rewards: data?.rewardsDelta ?? [],
                  summary: data?.rewardSummary ? {
                    teamMember: data.rewardSummary.teamMember,
                    totalXpAwarded: data.rewardSummary.totalXpAwarded,
                    totalRewardPointsAwarded: data.rewardSummary.totalRewardPointsAwarded,
                    prestigeCredits: data.rewardSummary.gamification?.prestigeCredits,
                  } : null,
                });
                openMomentToast({
                  action: "complete",
                  xpAwarded: Array.isArray(data?.rewardsDelta)
                    ? data.rewardsDelta.reduce((sum: number, r: { xpAwarded?: number }) => sum + Number(r?.xpAwarded ?? 0), 0) : 0,
                  rewardCreditsAwarded: Array.isArray(data?.rewardsDelta)
                    ? data.rewardsDelta.reduce((sum: number, r: { rewardPointsAwarded?: number }) => sum + Number(r?.rewardPointsAwarded ?? 0), 0) : 0,
                  prestigeCredits: data?.rewardSummary?.gamification?.prestigeCredits,
                });
              })}
            />
          ) : (
            <PacerPhaseCard
              mode={languageMode}
              phase={currentPhase}
              phaseIndex={safePhaseIndex}
              totalPhases={pacerPhases.length}
              secondsRemaining={phaseSecondsRemaining}
              secondsElapsed={phaseSecondsElapsed}
              booking={booking}
              sopSteps={booking.sopSteps}
              busy={busy}
              stepSyncMap={stepSyncMap}
              isLastPhase={isLastPacerPhase}
              onNextPhase={() => {
                setCurrentPhaseIndex((prev) => Math.min(prev + 1, pacerPhases.length - 1));
                setPacerPhaseStartAt(Date.now());
              }}
              onStepToggle={(stepKey, currentStatus) => void runAction(stepKey, () =>
                postJson(`/api/groomer/bookings/${booking.id}/sop/step`, {
                  stepKey,
                  status: currentStatus === "completed" ? "pending" : "completed",
                })
              )}
              onVideoCapture={(stepKey) => void openLiveVideoRecorder(stepKey).catch((error: unknown) => {
                setModalError(error instanceof Error ? error.message : "Camera khul nahi paaya.");
              })}
              onPhotoCapture={(stepKey, file) => void runAction(stepKey, () => uploadOrQueue(stepKey, file))}
              onRetrySync={() => void runSync()}
              onSkip={(stepKey, reason) => void runAction(stepKey, () =>
                postJson(`/api/groomer/bookings/${booking.id}/sop/step`, {
                  stepKey,
                  status: "skipped",
                  skipReason: reason,
                })
              )}
            />
          )}

          <button
            type="button"
            onClick={() => { setPacerMode(false); }}
            className="w-full rounded-[20px] border border-white/10 bg-white/5 px-4 py-3 text-[13px] font-semibold text-white/40"
          >
            {languageMode === "simple" ? "Puri checklist dekhein" : "पूरी चेकलिस्ट देखें"}
          </button>
        </div>

        {fuelSheetOverlay}
        {errorOverlay}
        {showCompleteModal && booking.status !== "completed" ? (
          <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/60 px-4 pb-8">
            <div className="w-full max-w-sm rounded-[28px] bg-white p-6 shadow-2xl">
              <div className="text-center">
                <div className="text-[40px]">🎉</div>
                <div className="mt-2 text-[20px] font-black text-[#1f1f2c]">
                  {languageMode === "simple" ? "Sab ho gaya!" : "सब हो गया!"}
                </div>
                <div className="mt-1 text-[14px] text-[#6b7280]">
                  {languageMode === "simple"
                    ? "SOP complete hai aur payment save ho gayi. Booking complete karein."
                    : "SOP पूरा है और पेमेंट सेव हो गई। बुकिंग पूरी करें।"}
                </div>
              </div>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => {
                  setShowCompleteModal(false);
                  void runAction("complete", async () => {
                    const res = await fetch(`/api/groomer/bookings/${booking.id}/complete${tokenQuery}`, { method: "POST" });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data?.error ?? "Booking complete nahi ho paayi.");
                    setRewardModal({ rewards: data?.rewardsDelta ?? [], summary: data?.rewardSummary ? { teamMember: data.rewardSummary.teamMember, totalXpAwarded: data.rewardSummary.totalXpAwarded, totalRewardPointsAwarded: data.rewardSummary.totalRewardPointsAwarded, prestigeCredits: data.rewardSummary.gamification?.prestigeCredits } : null });
                    openMomentToast({ action: "complete", xpAwarded: Array.isArray(data?.rewardsDelta) ? data.rewardsDelta.reduce((sum: number, r: { xpAwarded?: number }) => sum + Number(r?.xpAwarded ?? 0), 0) : 0, rewardCreditsAwarded: Array.isArray(data?.rewardsDelta) ? data.rewardsDelta.reduce((sum: number, r: { rewardPointsAwarded?: number }) => sum + Number(r?.rewardPointsAwarded ?? 0), 0) : 0, prestigeCredits: data?.rewardSummary?.gamification?.prestigeCredits });
                  });
                }}
                className="mt-5 flex h-[56px] w-full items-center justify-center gap-2 rounded-[20px] bg-[#6d5bd0] text-[16px] font-black text-white shadow-[0_8px_24px_rgba(109,91,208,0.35)] disabled:opacity-50"
              >
                ✓ {languageMode === "simple" ? "Booking complete karein" : "बुकिंग पूरी करें"}
              </button>
              <button
                type="button"
                onClick={() => setShowCompleteModal(false)}
                className="mt-3 w-full text-center text-[13px] font-semibold text-[#9ca3af]"
              >
                {languageMode === "simple" ? "Baad mein karunga" : "बाद में करूंगा"}
              </button>
            </div>
          </div>
        ) : null}
        {videoOverlay}
        {rewardOverlay}
        {toastOverlay}
      </div>
    );
  }

  // ── VIEW 2: Pre-arrival landing — full screen, one focus ──
  if (booking.dispatchState !== "started") {
    return (
      <>
        <LandingView
          booking={booking}
          mode={languageMode}
          dispatchState={booking.dispatchState}
          now={now}
          isPreview={isPreview}
          onNikalGaye={() => void runAction("en_route", async () => {
            let gpsLat: number | null = null;
            let gpsLng: number | null = null;
            // Hard 6s cap — geolocation can hang indefinitely on Android/Realme, never calling either callback
            await new Promise<void>((resolve) => {
              const fallback = setTimeout(resolve, 6000);
              navigator.geolocation.getCurrentPosition(
                (pos) => { gpsLat = pos.coords.latitude; gpsLng = pos.coords.longitude; clearTimeout(fallback); resolve(); },
                () => { clearTimeout(fallback); resolve(); },
                { timeout: 5000, maximumAge: 30000, enableHighAccuracy: false }
              );
            });
            const data = await postJson(`/api/groomer/bookings/${booking.id}/dispatch-state`, {
              dispatchState: "en_route",
              lat: gpsLat,
              lng: gpsLng,
            });
            if (data?.rewardsDelta?.length) {
              setRewardModal({
                rewards: data.rewardsDelta,
                summary: data.rewardSummary ? {
                  teamMember: data.rewardSummary.teamMember,
                  totalXpAwarded: data.rewardSummary.totalXpAwarded,
                  totalRewardPointsAwarded: data.rewardSummary.totalRewardPointsAwarded,
                  prestigeCredits: data.rewardSummary.gamification?.prestigeCredits,
                } : null,
              });
            }
            openMomentToast({
              action: "en_route",
              xpAwarded: Array.isArray(data?.rewardsDelta)
                ? data.rewardsDelta.reduce((sum: number, reward: { xpAwarded?: number }) => sum + Number(reward?.xpAwarded ?? 0), 0) : 0,
              rewardCreditsAwarded: Array.isArray(data?.rewardsDelta)
                ? data.rewardsDelta.reduce((sum: number, reward: { rewardPointsAwarded?: number }) => sum + Number(reward?.rewardPointsAwarded ?? 0), 0) : 0,
              prestigeCredits: data?.rewardSummary?.gamification?.prestigeCredits,
            });
          })}
          onPahunchGaye={() => {
            if (isPreview) {
              setPacerMode(true);
              setPacerPhaseStartAt(Date.now());
              setCurrentPhaseIndex(0);
              return;
            }
            setShowSessionStartModal(true);
          }}
        />

        {showSessionStartModal ? (
          <SessionStartModal
            booking={booking}
            mode={languageMode}
            onStart={() => {
              setShowSessionStartModal(false);
              // Show the fuel sheet immediately — don't wait for GPS (hangs on Android/Realme)
              setShowFuelSheet(true);
              // GPS runs in background to pre-fill distance; if it fails, groomer enters manually
              navigator.geolocation.getCurrentPosition(
                (pos) => { setArrivedGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
                () => { /* GPS unavailable — sheet already showing, groomer enters distance manually */ },
                { timeout: 10000, maximumAge: 30000, enableHighAccuracy: false }
              );
            }}
            onBack={() => setShowSessionStartModal(false)}
          />
        ) : null}

        {fuelSheetOverlay}
        {errorOverlay}
        {rewardOverlay}
        {toastOverlay}
      </>
    );
  }

  // ── VIEW 3: Session active, pacer toggled off — full checklist fallback ──
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

            {/* Pre-arrival countdown — shows until groomer arrives */}
            {preArrivalSecondsRemaining !== null ? (() => {
              const secs = preArrivalSecondsRemaining;
              const isLate = secs < 0;
              const absSecs = Math.abs(secs);
              const mins = Math.floor(absSecs / 60);
              const urgency = isLate
                ? { bg: "bg-[#fef2f2]", text: "text-[#b91c1c]", border: "border-[#fecaca]" }
                : secs <= 300
                  ? { bg: "bg-[#fff7ed]", text: "text-[#c2410c]", border: "border-[#fed7aa]" }
                  : secs <= 900
                    ? { bg: "bg-[#fffbeb]", text: "text-[#b45309]", border: "border-[#fde68a]" }
                    : { bg: "bg-[#f0fdf4]", text: "text-[#15803d]", border: "border-[#bbf7d0]" };
              return (
                <div className={`mt-3 rounded-[20px] border p-3 ${urgency.bg} ${urgency.border}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className={`text-[11px] font-black uppercase tracking-[0.1em] ${urgency.text}`}>
                        {isLate
                          ? (languageMode === "simple" ? "Late ho gaye" : "देर हो गई")
                          : (languageMode === "simple" ? "Session shuru hone mein" : "सेशन शुरू होने में")}
                      </div>
                      <div className={`mt-1 font-mono text-[28px] font-black tracking-[-0.04em] ${urgency.text}`}>
                        {isLate ? `+${formatTimer(absSecs)}` : formatTimer(absSecs)}
                      </div>
                      <div className={`mt-0.5 text-[12px] font-medium ${urgency.text} opacity-75`}>
                        {isLate
                          ? (languageMode === "simple"
                              ? `${mins} min late — jaldi pahunchiye`
                              : `${mins} मिनट देर — जल्दी पहुंचिए`)
                          : (languageMode === "simple"
                              ? `Slot: ${booking.bookingWindow?.label ?? "—"}`
                              : `स्लॉट: ${booking.bookingWindow?.label ?? "—"}`)}
                      </div>
                    </div>
                    {isLate ? (
                      <div className={`shrink-0 rounded-full border px-3 py-2 text-center text-[11px] font-black uppercase tracking-[0.1em] ${urgency.text} ${urgency.border} ${urgency.bg}`}>
                        {languageMode === "simple" ? "Hurry!" : "जल्दी!"}
                      </div>
                    ) : (
                      <div className={`shrink-0 rounded-full border px-3 py-2 text-center text-[11px] font-black uppercase tracking-[0.1em] ${urgency.text} ${urgency.border} ${urgency.bg}`}>
                        {languageMode === "simple" ? "On time" : "समय पर"}
                      </div>
                    )}
                  </div>
                </div>
              );
            })() : null}

            {/* SLA service timer — shows once groomer has arrived and session is running */}
            {slaSecondsRemaining !== null && ["started"].includes(booking.dispatchState) ? (
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

          {booking.pets.map((pet) => {
            const { info: parsedTemperamentInfo, cleanedNotes } = extractTemperament(pet.groomingNotes);
            const temperamentInfo = resolveTemperamentInfo(pet.temperament) ?? parsedTemperamentInfo;
            const TemperamentIcon = temperamentInfo?.Icon;
            return (
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
                  {temperamentInfo && TemperamentIcon ? (
                    <div className={`mt-2 inline-flex items-center gap-1.5 rounded-full border ${temperamentInfo.badgeBorder} ${temperamentInfo.badgeBg} px-2.5 py-1`}>
                      <TemperamentIcon className={`h-3.5 w-3.5 ${temperamentInfo.badgeText}`} strokeWidth={2.4} />
                      <span className={`text-[11.5px] font-bold uppercase tracking-[0.08em] ${temperamentInfo.badgeText}`}>
                        {temperamentInfo.label[languageMode]}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              {temperamentInfo ? (
                <div className={`mt-3 rounded-[18px] border ${temperamentInfo.badgeBorder} ${temperamentInfo.badgeBg} px-4 py-3`}>
                  <div className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${temperamentInfo.badgeText}`}>
                    {languageMode === "simple" ? "Handling brief" : "हैंडलिंग ब्रीफ़"}
                  </div>
                  <div className={`mt-1 text-[13.5px] font-semibold leading-[1.55] ${temperamentInfo.badgeText}`}>
                    {temperamentInfo.briefing[languageMode]}
                  </div>
                </div>
              ) : null}

              {resolveNote(cleanedNotes, languageMode) ? (
                <div className="mt-3 rounded-[18px] border border-[#d9e7fb] bg-[#f4f8ff] px-4 py-3 text-[14px] leading-[1.7] text-[#23415a]">
                  <div className="font-semibold text-[#23415a]">{languageMode === "simple" ? "Grooming notes" : "ग्रूमिंग नोट्स"}</div>
                  <div className="mt-1">{resolveNote(cleanedNotes, languageMode)}</div>
                </div>
              ) : null}

              {resolveNote(pet.stylingNotes, languageMode) ? (
                <div className="mt-3 rounded-[18px] border border-[#f1dfff] bg-[#fcf7ff] px-4 py-3 text-[14px] leading-[1.7] text-[#5b3a76]">
                  <div className="font-semibold text-[#5b3a76]">{languageMode === "simple" ? "Style / look" : "स्टाइल / लुक"}</div>
                  <div className="mt-1">{resolveNote(pet.stylingNotes, languageMode)}</div>
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
            );
          })}
        </div>

        {/* ─── Pacer mode ─── */}
        {pacerMode ? (
          <div className="space-y-3">
            {isLastPacerPhase ? (
              <PaymentPhaseCard
                mode={languageMode}
                booking={booking}
                busy={busy}
                onSave={async (collectionMode, amount, notes, image, applyServiceAmountChange) => {
                  await executeSavePayment(collectionMode, amount, notes, image, applyServiceAmountChange);
                  await refresh();
                }}
                onComplete={() => void runAction("complete", async () => {
                  const res = await fetch(`/api/groomer/bookings/${booking.id}/complete${tokenQuery}`, { method: "POST" });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error(data?.error ?? "Booking complete nahi ho paayi.");
                  setRewardModal({
                    rewards: data?.rewardsDelta ?? [],
                    summary: data?.rewardSummary ? {
                      teamMember: data.rewardSummary.teamMember,
                      totalXpAwarded: data.rewardSummary.totalXpAwarded,
                      totalRewardPointsAwarded: data.rewardSummary.totalRewardPointsAwarded,
                      prestigeCredits: data.rewardSummary.gamification?.prestigeCredits,
                    } : null,
                  });
                  openMomentToast({
                    action: "complete",
                    xpAwarded: Array.isArray(data?.rewardsDelta)
                      ? data.rewardsDelta.reduce((sum: number, r: { xpAwarded?: number }) => sum + Number(r?.xpAwarded ?? 0), 0)
                      : 0,
                    rewardCreditsAwarded: Array.isArray(data?.rewardsDelta)
                      ? data.rewardsDelta.reduce((sum: number, r: { rewardPointsAwarded?: number }) => sum + Number(r?.rewardPointsAwarded ?? 0), 0)
                      : 0,
                    prestigeCredits: data?.rewardSummary?.gamification?.prestigeCredits,
                  });
                })}
              />
            ) : (
              <PacerPhaseCard
                mode={languageMode}
                phase={currentPhase}
                phaseIndex={safePhaseIndex}
                totalPhases={pacerPhases.length}
                secondsRemaining={phaseSecondsRemaining}
                secondsElapsed={phaseSecondsElapsed}
                booking={booking}
                sopSteps={booking.sopSteps}
                busy={busy}
                stepSyncMap={stepSyncMap}
                isLastPhase={isLastPacerPhase}
                onNextPhase={() => {
                  setCurrentPhaseIndex((prev) => Math.min(prev + 1, pacerPhases.length - 1));
                  setPacerPhaseStartAt(Date.now());
                }}
                onStepToggle={(stepKey, currentStatus) => void runAction(stepKey, () =>
                  postJson(`/api/groomer/bookings/${booking.id}/sop/step`, {
                    stepKey,
                    status: currentStatus === "completed" ? "pending" : "completed",
                  })
                )}
                onVideoCapture={(stepKey) => void openLiveVideoRecorder(stepKey).catch((error: unknown) => {
                  setModalError(error instanceof Error ? error.message : "Camera khul nahi paaya.");
                })}
                onPhotoCapture={(stepKey, file) => void runAction(stepKey, () => uploadOrQueue(stepKey, file))}
                onRetrySync={() => void runSync()}
                onSkip={(stepKey, reason) => void runAction(stepKey, () =>
                  postJson(`/api/groomer/bookings/${booking.id}/sop/step`, {
                    stepKey,
                    status: "skipped",
                    skipReason: reason,
                  })
                )}
              />
            )}
            <button
              type="button"
              onClick={() => { setPacerMode(false); try { localStorage.removeItem(pacerStorageKey); } catch { /* ignore */ } }}
              className="w-full rounded-[20px] border border-[#ddd1fb] bg-white px-4 py-3 text-[13px] font-semibold text-[#6b7280]"
            >
              {languageMode === "simple" ? "View full checklist" : "पूरी चेकलिस्ट देखें"}
            </button>
          </div>
        ) : (
          <>
        {/* ─── Full checklist mode ─── */}
        {booking.dispatchState === "started" ? (
          <button
            type="button"
            onClick={() => { setPacerMode(true); setPacerPhaseStartAt((p) => p ?? Date.now()); }}
            className="flex h-[56px] w-full items-center justify-center gap-2 rounded-[22px] bg-[linear-gradient(135deg,#6d5bd0,#8b7be7)] text-[15px] font-semibold text-white"
          >
            {languageMode === "simple" ? "Pacer mode chalao" : "पेसर मोड चलाएं"}
          </button>
        ) : null}
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
                {step.key === "review_proof" ? (
                  <div className="mb-3">
                    <GroomerQrCard
                      title={languageMode === "simple" ? "Google review QR" : "गूगल रिव्यू QR"}
                      hint={languageMode === "simple" ? "Review maangte waqt customer ko ye QR scan karwa dein." : "रिव्यू लेते वक्त कस्टमर को यह QR स्कैन करवा दें।"}
                      src={GROOMER_GOOGLE_REVIEW_QR_URL}
                      alt="All Tails Google review QR code"
                    />
                  </div>
                ) : null}

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
            <div className="grid gap-3">
              <GroomerQrCard
                title={languageMode === "simple" ? "Company payment QR" : "कंपनी पेमेंट QR"}
                hint={languageMode === "simple" ? "Customer ko scan karwa ke online payment collect karein." : "कस्टमर को स्कैन करवा के ऑनलाइन पेमेंट लें।"}
                src={GROOMER_PAYMENT_QR_URL}
                alt="All Tails company payment QR code"
              />
            </div>

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
          </>
        )}
      </div>

      {fuelSheetOverlay}
      {errorOverlay}
      {videoOverlay}
      {rewardOverlay}
      {toastOverlay}
    </div>
  );
}
