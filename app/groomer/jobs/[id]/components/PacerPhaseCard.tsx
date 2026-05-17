"use client";

import { Camera, CheckCircle2, ChevronRight, Circle, Video } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

function playAlarmBeep() {
  try {
    const ctx = new AudioContext();
    const times = [0, 0.35];
    for (const t of times) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.35, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.28);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.3);
    }
  } catch {
    // Web Audio not available
  }
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([250, 80, 250]);
    }
  } catch {
    // Vibration not available
  }
}
import type { PacerPhase } from "../../../../../lib/booking/pacerPhases";
import type { GroomerBookingView } from "../../../../../lib/groomerPortal";
import { SyncStatusBadge } from "./SyncStatusBadge";
import type { StepSyncState } from "../hooks/useOfflineQueue";

type SopStep = GroomerBookingView["sopSteps"][number];

type Props = {
  mode: "simple" | "hindi";
  phase: PacerPhase;
  phaseIndex: number;
  totalPhases: number;
  secondsRemaining: number;
  secondsElapsed: number;
  booking: GroomerBookingView;
  sopSteps: SopStep[];
  busy: string | null;
  stepSyncMap: Record<string, StepSyncState>;
  isLastPhase: boolean;
  onNextPhase: () => void;
  onStepToggle: (stepKey: string, currentStatus: string) => void;
  onVideoCapture: (stepKey: string) => void;
  onPhotoCapture: (stepKey: string, file: File) => void;
  onRetrySync: () => void;
};

function formatTimer(seconds: number) {
  const safe = Math.max(0, seconds);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function timerColorClass(secondsRemaining: number, totalSeconds: number): string {
  if (secondsRemaining <= 0) return "bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]";
  if (secondsRemaining <= totalSeconds * 0.25) return "bg-[#fffbeb] text-[#b45309] border-[#fde68a]";
  return "bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]";
}

function timerBarPercent(secondsRemaining: number, totalSeconds: number): number {
  if (totalSeconds <= 0) return 0;
  return Math.max(0, Math.min(100, (secondsRemaining / totalSeconds) * 100));
}

function timerBarColor(secondsRemaining: number, totalSeconds: number): string {
  if (secondsRemaining <= 0) return "bg-[#ef4444]";
  if (secondsRemaining <= totalSeconds * 0.25) return "bg-[#f59e0b]";
  return "bg-[#16a34a]";
}

function PhaseProofRow({
  step,
  mode,
  busy,
  syncState,
  onStepToggle,
  onVideoCapture,
  onPhotoCapture,
  onRetry,
}: {
  step: SopStep;
  mode: "simple" | "hindi";
  busy: string | null;
  syncState?: StepSyncState;
  onStepToggle: () => void;
  onVideoCapture: () => void;
  onPhotoCapture: (file: File) => void;
  onRetry: () => void;
}) {
  const done = step.status === "completed";
  const label = mode === "simple" ? step.groomerLabel : step.groomerLabelHindi;
  const hint = mode === "simple" ? step.groomerHint : step.groomerHintHindi;

  return (
    <div className={`rounded-[20px] border p-4 ${done ? "border-[#bbf7d0] bg-[#f0fdf4]" : "border-[#e5e7eb] bg-white"}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${done ? "border-[#16a34a] bg-[#16a34a] text-white" : "border-[#d1d5db] bg-white text-[#9ca3af]"}`}>
          {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[15px] font-bold text-[#1f1f2c]">{label}</div>
            {syncState && (
              <SyncStatusBadge
                status={syncState.status}
                pendingCount={syncState.pendingCount}
                mode={mode}
                onRetry={onRetry}
              />
            )}
          </div>
          {hint && !done ? (
            <div className="mt-1 text-[13px] leading-[1.6] text-[#6b7280]">{hint}</div>
          ) : null}

          {!done && (
            <div className="mt-3 flex flex-wrap gap-2">
              {step.proofType === "manual" && (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={onStepToggle}
                  className="flex h-[48px] items-center gap-2 rounded-[14px] bg-[#16a34a] px-5 text-[14px] font-semibold text-white disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {mode === "simple" ? "Ho gaya" : "हो गया"}
                </button>
              )}
              {step.proofType === "video" && (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={onVideoCapture}
                  className="flex h-[48px] items-center gap-2 rounded-[14px] bg-[#6d5bd0] px-5 text-[14px] font-semibold text-white disabled:opacity-50"
                >
                  <Video className="h-4 w-4" />
                  {mode === "simple" ? "Video record karein" : "वीडियो रिकॉर्ड करें"}
                </button>
              )}
              {step.proofType === "image" && (
                <label className="flex h-[48px] cursor-pointer items-center gap-2 rounded-[14px] bg-[#6d5bd0] px-5 text-[14px] font-semibold text-white opacity-100">
                  <Camera className="h-4 w-4" />
                  {mode === "simple" ? "Photo lo" : "फोटो लो"}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    disabled={busy !== null}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onPhotoCapture(file);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
              )}
              {step.proofType === "mixed" && (
                <>
                  <label className="flex h-[48px] cursor-pointer items-center gap-2 rounded-[14px] bg-[#6d5bd0] px-5 text-[14px] font-semibold text-white">
                    <Camera className="h-4 w-4" />
                    {mode === "simple" ? "Photo" : "फोटो"}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      disabled={busy !== null}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onPhotoCapture(file);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={onVideoCapture}
                    className="flex h-[48px] items-center gap-2 rounded-[14px] border border-[#ddd1fb] bg-white px-5 text-[14px] font-semibold text-[#6d5bd0] disabled:opacity-50"
                  >
                    <Video className="h-4 w-4" />
                    {mode === "simple" ? "Video" : "वीडियो"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PacerPhaseCard({
  mode,
  phase,
  phaseIndex,
  totalPhases,
  secondsRemaining,
  secondsElapsed,
  booking,
  sopSteps,
  busy,
  stepSyncMap,
  isLastPhase,
  onNextPhase,
  onStepToggle,
  onVideoCapture,
  onPhotoCapture,
  onRetrySync,
}: Props) {
  const totalSeconds = phase.durationMinutes * 60;
  const timerColor = timerColorClass(secondsRemaining, totalSeconds);
  const barPercent = timerBarPercent(secondsRemaining, totalSeconds);
  const barColor = timerBarColor(secondsRemaining, totalSeconds);

  const [minTimeWarning, setMinTimeWarning] = useState(false);
  const alarmFiredRef = useRef(false);

  // Reset alarm and warning when phase changes
  useEffect(() => {
    alarmFiredRef.current = false;
    setMinTimeWarning(false);
  }, [phase.key]);

  // Fire alarm at 120 seconds remaining (once per phase)
  useEffect(() => {
    if (!alarmFiredRef.current && secondsRemaining <= 120 && secondsRemaining > 0) {
      alarmFiredRef.current = true;
      playAlarmBeep();
    }
  }, [secondsRemaining]);

  const phaseSteps = phase.sopKeys
    .map((key) => sopSteps.find((s) => s.key === key))
    .filter(Boolean) as SopStep[];

  const allPhaseSopDone = phaseSteps.length === 0 || phaseSteps.every((s) => s.status === "completed");

  // Oil phase: must complete at least 80% of time before advancing
  const minElapsedSeconds = phase.minTimePercent
    ? Math.floor(totalSeconds * (phase.minTimePercent / 100))
    : 0;
  const minTimeNotReached = phase.minTimePercent ? secondsElapsed < minElapsedSeconds : false;
  const canAdvance = allPhaseSopDone && !minTimeNotReached;

  const handleNextPhase = () => {
    if (minTimeNotReached) {
      setMinTimeWarning(true);
      playAlarmBeep();
      return;
    }
    setMinTimeWarning(false);
    onNextPhase();
  };

  // Resolve coach note
  let coachNote: string | null = null;
  if (phase.coachNoteSource === "groomingNotes") {
    coachNote = booking.pets[0]?.groomingNotes ?? null;
  } else if (phase.coachNoteSource === "stylingNotes") {
    coachNote = booking.pets[0]?.stylingNotes ?? null;
  } else if (phase.coachNoteSource === "temperament") {
    const t = booking.pets[0]?.temperament;
    if (t) {
      const map: Record<string, string> = {
        calm: mode === "simple" ? "Calm pet — go smooth and steady." : "शांत पेट — आराम से करें।",
        sweet_soul: mode === "simple" ? "Calm pet — go smooth and steady." : "शांत पेट — आराम से करें।",
        wiggle_worrier: mode === "simple" ? "Anxious pet — befriend first, go slow." : "घबराया हुआ पेट — पहले दोस्ती करें, धीरे करें।",
        anxious: mode === "simple" ? "Anxious pet — befriend first, go slow." : "घबराया हुआ पेट — पहले दोस्ती करें, धीरे करें।",
        spicy_spark: mode === "simple" ? "Can bite — ask parent for muzzle help. Safety first." : "काट सकता है — पैरेंट से मज़ल लगवाएं। सुरक्षा पहले।",
        can_bite: mode === "simple" ? "Can bite — ask parent for muzzle help. Safety first." : "काट सकता है — पैरेंट से मज़ल लगवाएं। सुरक्षा पहले।",
      };
      coachNote = map[t.toLowerCase()] ?? null;
    }
  }

  const stylePhotos = booking.pets[0]?.stylingReferenceUrls ?? [];

  const isPaymentPhase = phase.key === "payment_review";

  return (
    <div className="flex min-h-[calc(100dvh-80px)] flex-col rounded-[30px] border border-[#eadffd] bg-white shadow-[0_18px_48px_rgba(73,44,120,0.08)]">
      {/* Phase header */}
      <div className="rounded-t-[30px] bg-[linear-gradient(135deg,#1f1f2c_0%,#3b3465_100%)] p-5 text-white">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/60">
            {mode === "simple"
              ? `Phase ${phaseIndex + 1} of ${totalPhases}`
              : `चरण ${phaseIndex + 1} / ${totalPhases}`}
          </div>
          <div className="flex gap-1">
            {Array.from({ length: totalPhases }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-6 rounded-full transition-colors ${
                  i < phaseIndex ? "bg-[#16a34a]" : i === phaseIndex ? "bg-white" : "bg-white/25"
                }`}
              />
            ))}
          </div>
        </div>
        <div className="mt-3 text-[26px] font-black tracking-[-0.03em]">
          {mode === "simple" ? phase.label : phase.labelHindi}
        </div>
        <div className="mt-1 text-[13px] text-white/70">
          {mode === "simple"
            ? `Target: ${phase.durationMinutes} min`
            : `लक्ष्य: ${phase.durationMinutes} मिनट`}
        </div>

        {/* Timer */}
        <div className={`mt-4 rounded-[20px] border p-4 ${timerColor}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] opacity-70">
                {secondsRemaining > 0
                  ? (mode === "simple" ? "Time left" : "बचा समय")
                  : (mode === "simple" ? "Over time" : "समय पार")}
              </div>
              <div className="mt-1 font-mono text-[36px] font-black tracking-[-0.04em]">
                {formatTimer(Math.abs(secondsRemaining))}
              </div>
            </div>
            <div className="text-right text-[12px] opacity-70">
              <div>{phase.durationMinutes} min</div>
              <div>{mode === "simple" ? "budget" : "बजट"}</div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black/10">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
              style={{ width: `${barPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">

        {/* Coach note */}
        {(coachNote ?? phase.coachNoteHint) ? (
          <div className="mb-4 rounded-[20px] border border-[#fde68a] bg-[#fffbeb] p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#92400e]">
              {mode === "simple" ? "Coach note" : "कोच नोट"}
            </div>
            <div className="mt-1.5 text-[14px] leading-[1.65] text-[#78350f]">
              {coachNote ?? (mode === "simple" ? phase.coachNoteHint : phase.coachNoteHintHindi)}
            </div>
          </div>
        ) : null}

        {/* Style reference photos (only in style phases) */}
        {phase.coachNoteSource === "stylingNotes" && stylePhotos.length > 0 ? (
          <div className="mb-4">
            <div className="mb-2 text-[12px] font-semibold text-[#4b5563]">
              {mode === "simple" ? "Style reference" : "स्टाइल रेफरेंस"}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {stylePhotos.map((url, i) => (
                <a key={url} href={url} target="_blank" rel="noreferrer" className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Style ref ${i + 1}`} className="h-[88px] w-[88px] rounded-[16px] border border-[#ece5ff] object-cover" />
                </a>
              ))}
            </div>
          </div>
        ) : null}

        {/* Task checklist */}
        <div className="mb-4 space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">
            {mode === "simple" ? "Is phase mein karna hai" : "इस चरण में करना है"}
          </div>
          {(mode === "simple" ? phase.tasks : phase.tasksHindi).map((task, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-[14px] border border-[#f3f4f6] bg-[#f9fafb] px-3 py-2.5">
              <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[#6d5bd0]" />
              <span className="text-[14px] leading-[1.5] text-[#374151]">{task}</span>
            </div>
          ))}
        </div>

        {/* SOP proof steps for this phase */}
        {phaseSteps.length > 0 && !isPaymentPhase ? (
          <div className="space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">
              {mode === "simple" ? "Proof required" : "प्रूफ ज़रूरी है"}
            </div>
            {phaseSteps.map((step) => (
              <PhaseProofRow
                key={step.key}
                step={step}
                mode={mode}
                busy={busy}
                syncState={stepSyncMap[step.key]}
                onStepToggle={() => onStepToggle(step.key, step.status)}
                onVideoCapture={() => onVideoCapture(step.key)}
                onPhotoCapture={(file) => onPhotoCapture(step.key, file)}
                onRetry={onRetrySync}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* Next phase CTA */}
      <div className="border-t border-[#f3f4f6] p-4">
        {/* SOP not done warning */}
        {!allPhaseSopDone && phaseSteps.length > 0 ? (
          <div className="mb-3 rounded-[14px] bg-[#fffbeb] px-4 py-2.5 text-[13px] text-[#92400e]">
            {mode === "simple"
              ? "Sab proof upload ho jaye — phir aage badh sakte ho."
              : "सब प्रूफ अपलोड हो जाएं — फिर आगे बढ़ सकते हो।"}
          </div>
        ) : null}

        {/* Oil min-time warning */}
        {minTimeWarning ? (
          <div className="mb-3 rounded-[14px] border border-[#fde68a] bg-[#fffbeb] px-4 py-3">
            <div className="text-[14px] font-black text-[#92400e]">
              {mode === "simple" ? "⚠️ Oil abhi kaam kar raha hai" : "⚠️ ऑयल अभी काम कर रहा है"}
            </div>
            <div className="mt-1 text-[13px] leading-[1.6] text-[#78350f]">
              {mode === "simple"
                ? `Oil ko kam se kam ${Math.ceil(minElapsedSeconds / 60)} min tak rehna chahiye. Agar pehle shampoo karein to oil ka effect kam ho jaata hai aur coat ki quality gir jaati hai. ${Math.ceil((minElapsedSeconds - secondsElapsed) / 60)} min aur ruko.`
                : `ऑयल को कम से कम ${Math.ceil(minElapsedSeconds / 60)} मिनट तक रहना चाहिए। अगर पहले शैम्पू करें तो ऑयल का असर कम हो जाता है। ${Math.ceil((minElapsedSeconds - secondsElapsed) / 60)} मिनट और रुकें।`}
            </div>
            <button
              type="button"
              onClick={() => setMinTimeWarning(false)}
              className="mt-2 text-[12px] font-semibold text-[#92400e] underline underline-offset-2"
            >
              {mode === "simple" ? "Samajh gaya" : "समझ गया"}
            </button>
          </div>
        ) : null}

        {!isLastPhase ? (
          <button
            type="button"
            onClick={handleNextPhase}
            disabled={!allPhaseSopDone || busy !== null}
            className="flex h-[56px] w-full items-center justify-center gap-2 rounded-[18px] bg-[#6d5bd0] text-[16px] font-semibold text-white disabled:opacity-40"
          >
            {mode === "simple" ? "Next phase" : "अगला चरण"}
            <ChevronRight className="h-5 w-5" />
          </button>
        ) : (
          <div className="rounded-[14px] bg-[#f0fdf4] px-4 py-3 text-center text-[14px] text-[#15803d]">
            {mode === "simple"
              ? "Payment aur review ke baad booking complete karein."
              : "पेमेंट और रिव्यू के बाद बुकिंग पूरी करें।"}
          </div>
        )}
      </div>
    </div>
  );
}
