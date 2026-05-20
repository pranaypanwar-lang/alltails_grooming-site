"use client";

import { Camera, CheckCircle2, ChevronDown, ChevronRight, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CoachingStep, PacerPhase } from "../../../../../lib/booking/pacerPhases";
import type { GroomerBookingView } from "../../../../../lib/groomerPortal";
import { resolveNote } from "../../../../../lib/noteUtils";
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
  onSkip: (stepKey: string, reason: string) => void;
};

function fmt(seconds: number) {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function playAlarmBeep() {
  try {
    const ctx = new AudioContext();
    for (const t of [0, 0.35]) {
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
  } catch { /* ignore */ }
  try { navigator.vibrate?.([250, 80, 250]); } catch { /* ignore */ }
}

function timerColor(rem: number, total: number) {
  if (rem <= 0) return { num: "text-[#f87171]", bar: "bg-[#ef4444]", label: "text-[#f87171]/70" };
  if (rem <= total * 0.25) return { num: "text-[#fb923c]", bar: "bg-[#f97316]", label: "text-[#fb923c]/70" };
  return { num: "text-[#4ade80]", bar: "bg-[#22c55e]", label: "text-[#4ade80]/70" };
}

// Groomer guide — collapsible coaching step accordion inside the focus card
function GuideAccordion({ steps, mode }: { steps: CoachingStep[]; mode: "simple" | "hindi" }) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  if (!steps.length) return null;

  return (
    <div className="mt-4 space-y-1.5">
      <div className="mb-2 flex items-center gap-2">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/30">
          {mode === "simple" ? "Grooming guide" : "ग्रूमिंग गाइड"}
        </span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      {steps.map((cs) => {
        const isOpen = openKey === cs.key;
        const label = mode === "simple" ? cs.label : cs.labelHindi;
        const howTo = mode === "simple" ? cs.howTo : cs.howToHindi;
        const avoid = mode === "simple" ? cs.avoid : cs.avoidHindi;
        const doneSign = mode === "simple" ? cs.doneSign : cs.doneSignHindi;
        const nervousNote = mode === "simple" ? cs.nervousNote : cs.nervousNoteHindi;

        return (
          <div
            key={cs.key}
            className="overflow-hidden rounded-[14px] border border-white/8 bg-white/5"
          >
            <button
              type="button"
              onClick={() => setOpenKey(isOpen ? null : cs.key)}
              className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left"
            >
              <div className="min-w-0">
                <div className="text-[12.5px] font-bold text-white/70">{label}</div>
                <div className="text-[10px] text-white/30">{cs.timeLabel}</div>
              </div>
              <ChevronDown
                className={`h-3.5 w-3.5 shrink-0 text-white/30 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isOpen ? (
              <div className="space-y-2 border-t border-white/8 px-3.5 pb-3.5 pt-3">
                <div className="rounded-[10px] bg-[#1a3a26] px-3 py-2.5">
                  <div className="mb-1 text-[9px] font-black uppercase tracking-[0.14em] text-[#4ade80]/70">
                    {mode === "simple" ? "Kaise karein" : "कैसे करें"}
                  </div>
                  <div className="text-[12px] leading-[1.65] text-[#86efac]">{howTo}</div>
                </div>
                {avoid ? (
                  <div className="rounded-[10px] bg-[#3a1a1a] px-3 py-2.5">
                    <div className="mb-1 text-[9px] font-black uppercase tracking-[0.14em] text-[#f87171]/70">
                      {mode === "simple" ? "Mat karein" : "मत करें"}
                    </div>
                    <div className="text-[12px] leading-[1.65] text-[#fca5a5]">{avoid}</div>
                  </div>
                ) : null}
                <div className="rounded-[10px] bg-[#1a2a3a] px-3 py-2.5">
                  <div className="mb-1 text-[9px] font-black uppercase tracking-[0.14em] text-[#7dd3fc]/70">
                    {mode === "simple" ? "Done sign" : "पूरा होने का संकेत"}
                  </div>
                  <div className="text-[12px] leading-[1.65] text-[#bae6fd]">{doneSign}</div>
                </div>
                {nervousNote ? (
                  <div className="rounded-[10px] bg-[#2a2210] px-3 py-2.5">
                    <div className="mb-1 text-[9px] font-black uppercase tracking-[0.14em] text-[#fcd34d]/70">
                      {mode === "simple" ? "Nervous dog" : "Nervous dog"}
                    </div>
                    <div className="text-[12px] leading-[1.65] text-[#fde68a]">{nervousNote}</div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

// The main focus card for one SOP step
function StepFocusCard({
  step,
  stepNumber,
  totalSteps,
  mode,
  busy,
  syncState,
  coachNote,
  coachingSteps,
  onStepToggle,
  onVideoCapture,
  onPhotoCapture,
  onRetry,
  onSkip,
}: {
  step: SopStep;
  stepNumber: number;
  totalSteps: number;
  mode: "simple" | "hindi";
  busy: string | null;
  syncState?: StepSyncState;
  coachNote: string | null;
  coachingSteps: CoachingStep[];
  onStepToggle: () => void;
  onVideoCapture: () => void;
  onPhotoCapture: (file: File) => void;
  onRetry: () => void;
  onSkip: (reason: string) => void;
}) {
  const [showSkip, setShowSkip] = useState(false);
  const [skipReason, setSkipReason] = useState("");

  const label = mode === "simple" ? step.groomerLabel : step.groomerLabelHindi;
  const hint = mode === "simple" ? step.groomerHint : step.groomerHintHindi;

  return (
    <>
      {/* Inject animation keyframe */}
      <style>{`
        @keyframes cardRise {
          from { opacity: 0; transform: translateY(28px) scale(0.97); filter: blur(6px); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    filter: blur(0);   }
        }
        .step-focus-card { animation: cardRise 0.45s cubic-bezier(0.32, 0.72, 0, 1) both; }
      `}</style>

      <div className="step-focus-card rounded-[28px] border border-[#6d5bd0]/40 bg-white p-5 shadow-[0_0_0_1px_rgba(109,91,208,0.15),0_24px_64px_rgba(109,91,208,0.25),0_4px_16px_rgba(0,0,0,0.2)]">

        {/* Step counter + sync */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#6d5bd0] text-[12px] font-black text-white">
              {stepNumber}
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#8a90a6]">
              {mode === "simple" ? `of ${totalSteps}` : `/ ${totalSteps}`}
            </span>
          </div>
          {syncState ? (
            <SyncStatusBadge
              status={syncState.status}
              pendingCount={syncState.pendingCount}
              mode={mode}
              onRetry={onRetry}
            />
          ) : null}
        </div>

        {/* Step label */}
        <div className="text-[26px] font-black leading-[1.1] tracking-[-0.03em] text-[#1f1f2c]">
          {label}
        </div>

        {/* Hint */}
        {hint ? (
          <div className="mt-2.5 text-[13.5px] leading-[1.65] text-[#6b7280]">{hint}</div>
        ) : null}

        {/* Step-specific groomer note (from admin/ops input) — shown first, highest priority */}
        {resolveNote(step.groomerNote, mode) ? (
          <div className="mt-3.5 rounded-[16px] border border-[#c4b5fd] bg-[#f5f3ff] px-3.5 py-3">
            <div className="mb-1 flex items-center gap-1.5">
              <div className="text-[10px] font-black uppercase tracking-[0.12em] text-[#6d28d9]">
                {mode === "simple" ? "Groomer note" : "ग्रूमर नोट"}
              </div>
            </div>
            <div className="text-[13px] leading-[1.65] text-[#4c1d95]">{resolveNote(step.groomerNote, mode)}</div>
          </div>
        ) : null}

        {/* Phase-level coach note (from pet temperament / grooming / styling data) */}
        {resolveNote(coachNote, mode) ? (
          <div className="mt-3 rounded-[16px] border border-[#fde68a] bg-[#fffbeb] px-3.5 py-3">
            <div className="mb-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#b45309]">
              {mode === "simple" ? "Pet note" : "पेट नोट"}
            </div>
            <div className="text-[13px] leading-[1.65] text-[#78350f]">{resolveNote(coachNote, mode)}</div>
          </div>
        ) : null}

        {/* Action buttons */}
        <div className="mt-5 flex flex-wrap gap-2.5">
          {step.proofType === "manual" ? (
            <button
              type="button"
              disabled={busy !== null}
              onClick={onStepToggle}
              className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-[16px] bg-[#16a34a] text-[15px] font-bold text-white shadow-[0_4px_16px_rgba(22,163,74,0.25)] disabled:opacity-50"
            >
              <CheckCircle2 className="h-5 w-5" />
              {mode === "simple" ? "Ho Gaya" : "हो गया"}
            </button>
          ) : null}

          {(step.proofType === "image" || step.proofType === "mixed") ? (
            <label className="flex h-[52px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-[16px] bg-[#6d5bd0] text-[15px] font-bold text-white shadow-[0_4px_16px_rgba(109,91,208,0.25)]">
              <Camera className="h-5 w-5" />
              {mode === "simple" ? "Photo Lo" : "फोटो लो"}
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
          ) : null}

          {(step.proofType === "video" || step.proofType === "mixed") ? (
            <button
              type="button"
              disabled={busy !== null}
              onClick={onVideoCapture}
              className={`flex h-[52px] items-center justify-center gap-2 rounded-[16px] text-[15px] font-bold disabled:opacity-50 ${step.proofType === "mixed" ? "border border-[#ddd1fb] bg-white text-[#6d5bd0] shadow-none px-4" : "flex-1 bg-[#6d5bd0] text-white shadow-[0_4px_16px_rgba(109,91,208,0.2)]"}`}
            >
              <Video className="h-5 w-5" />
              {step.proofType === "mixed"
                ? (mode === "simple" ? "Video" : "वीडियो")
                : (mode === "simple" ? "Video Record Karo" : "वीडियो रिकॉर्ड करो")}
            </button>
          ) : null}
        </div>

        {/* Proofs uploaded (show if any) */}
        {step.proofs.length > 0 ? (
          <div className="mt-3 space-y-1.5">
            {step.proofs.map((proof) => (
              <a
                key={proof.id}
                href={proof.publicUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-[12px] border border-[#ece5ff] bg-[#faf8ff] px-3 py-2.5 text-[12px] text-[#2a2346]"
              >
                <span className="truncate">{proof.originalName}</span>
                <span className="ml-2 shrink-0 font-semibold text-[#6d5bd0]">
                  {mode === "simple" ? "Kholo" : "खोलो"}
                </span>
              </a>
            ))}
          </div>
        ) : null}

        {/* Coaching steps guide (collapsible, dark theme inside white card) */}
        {coachingSteps.length > 0 ? (
          <div className="mt-4 rounded-[18px] bg-[#0e0c1a] p-3">
            <GuideAccordion steps={coachingSteps} mode={mode} />
          </div>
        ) : null}

        {/* Skip option */}
        {!showSkip ? (
          <button
            type="button"
            onClick={() => setShowSkip(true)}
            className="mt-3 text-[11px] font-semibold text-white/25 underline underline-offset-2"
          >
            {mode === "simple" ? "Skip this step" : "यह स्टेप स्किप करें"}
          </button>
        ) : (
          <div className="mt-3 rounded-[16px] border border-white/10 bg-white/5 p-3">
            <div className="text-[12px] font-semibold text-white/60 mb-2">
              {mode === "simple" ? "Reason for skipping:" : "स्किप करने का कारण:"}
            </div>
            <textarea
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
              rows={2}
              placeholder={mode === "simple" ? "e.g. Customer refused, pet too anxious..." : "उदाहरण: कस्टमर ने मना किया, पेट बहुत घबराया हुआ था..."}
              className="w-full resize-none rounded-[10px] bg-white/10 border border-white/15 px-3 py-2 text-[12px] text-white/80 outline-none placeholder:text-white/25"
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={!skipReason.trim()}
                onClick={() => { onSkip(skipReason.trim()); setShowSkip(false); setSkipReason(""); }}
                className="flex-1 rounded-[10px] bg-[#dc2626] px-3 py-2 text-[12px] font-bold text-white disabled:opacity-40"
              >
                {mode === "simple" ? "Confirm skip" : "स्किप कन्फर्म करें"}
              </button>
              <button
                type="button"
                onClick={() => { setShowSkip(false); setSkipReason(""); }}
                className="rounded-[10px] border border-white/15 px-3 py-2 text-[12px] font-semibold text-white/50"
              >
                {mode === "simple" ? "Cancel" : "रद्द करें"}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
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
  onSkip,
}: Props) {
  const totalSeconds = phase.durationMinutes * 60;
  const colors = timerColor(secondsRemaining, totalSeconds);
  const barPct = Math.max(0, Math.min(100, (secondsRemaining / totalSeconds) * 100));

  const alarmFiredRef = useRef(false);
  useEffect(() => { alarmFiredRef.current = false; }, [phase.key]);
  useEffect(() => {
    if (!alarmFiredRef.current && secondsRemaining <= 120 && secondsRemaining > 0) {
      alarmFiredRef.current = true;
      playAlarmBeep();
    }
  }, [secondsRemaining]);

  // Min-time warning (oil phase)
  const [minTimeWarning, setMinTimeWarning] = useState(false);
  useEffect(() => { setMinTimeWarning(false); }, [phase.key]);

  // Rotating coaching tips for timed phases
  const [tipIndex, setTipIndex] = useState(0);
  useEffect(() => {
    if (!phase.timedCoachingTips?.length) return;
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % (phase.timedCoachingTips?.length ?? 1));
    }, 120_000); // rotate every 2 minutes
    return () => clearInterval(interval);
  }, [phase.timedCoachingTips?.length]);
  useEffect(() => { setTipIndex(0); }, [phase.key]);

  const minElapsedSeconds = phase.minTimePercent
    ? Math.floor(totalSeconds * (phase.minTimePercent / 100))
    : 0;
  const minTimeNotReached = phase.minTimePercent ? secondsElapsed < minElapsedSeconds : false;

  // Resolve per-phase coach note (from pet data)
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
        wiggle_worrier: mode === "simple" ? "Anxious pet — befriend first, go slow." : "घबराया हुआ पेट — पहले दोस्ती करें।",
        anxious: mode === "simple" ? "Anxious pet — befriend first, go slow." : "घबराया हुआ पेट — पहले दोस्ती करें।",
        spicy_spark: mode === "simple" ? "Can bite — ask parent for muzzle. Safety first." : "काट सकता है — पैरेंट से मज़ल लगवाएं।",
        can_bite: mode === "simple" ? "Can bite — ask parent for muzzle. Safety first." : "काट सकता है — पैरेंट से मज़ल लगवाएं।",
      };
      coachNote = map[t.toLowerCase()] ?? null;
    }
  }

  // Build ordered step list for this phase
  const phaseSteps = phase.sopKeys
    .map((key) => sopSteps.find((s) => s.key === key))
    .filter(Boolean) as SopStep[];

  const completedSteps = phaseSteps.filter((s) => s.status === "completed");
  const pendingSteps = phaseSteps.filter((s) => s.status !== "completed");
  const activeStep = pendingSteps[0] ?? null;
  const nextStep = pendingSteps[1] ?? null;
  const allPhaseSopDone = pendingSteps.length === 0;

  // For phases with no SOP steps, show coaching guide directly
  const isGuidanceOnlyPhase = phaseSteps.length === 0;

  const handleNextPhase = () => {
    if (minTimeNotReached) { setMinTimeWarning(true); playAlarmBeep(); return; }
    setMinTimeWarning(false);
    onNextPhase();
  };

  return (
    <div className="flex min-h-[calc(100dvh-56px)] flex-col">

      {/* ── PHASE HEADER ─────────────────────────────────── */}
      <div className="px-1 pb-3 pt-1">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white/30">
              {mode === "simple"
                ? `Phase ${phaseIndex + 1} of ${totalPhases}`
                : `चरण ${phaseIndex + 1} / ${totalPhases}`}
            </div>
            <div className="mt-0.5 text-[20px] font-black tracking-[-0.03em] text-white">
              {mode === "simple" ? phase.label : phase.labelHindi}
            </div>
          </div>
          {/* Phase progress dots */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPhases }).map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i < phaseIndex
                    ? "h-2 w-2 bg-[#4ade80]"
                    : i === phaseIndex
                    ? "h-2 w-4 bg-[#6d5bd0]"
                    : "h-2 w-2 bg-white/15"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── TIMER ─────────────────────────────────────────── */}
      <div className="mb-4 rounded-[22px] border border-white/8 bg-white/5 px-4 py-3.5 backdrop-blur-sm">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className={`text-[11px] font-bold uppercase tracking-[0.1em] ${colors.label}`}>
              {secondsRemaining > 0
                ? (mode === "simple" ? "Time left" : "बचा समय")
                : (mode === "simple" ? "Over time" : "समय पार")}
            </div>
            <div className={`mt-0.5 font-mono text-[44px] font-black leading-none tracking-[-0.04em] ${colors.num}`}>
              {fmt(Math.abs(secondsRemaining))}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-semibold text-white/25">
              {mode === "simple" ? "Target" : "लक्ष्य"}
            </div>
            <div className="text-[18px] font-black text-white/40">{phase.durationMinutes}m</div>
          </div>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${colors.bar}`}
            style={{ width: `${barPct}%` }}
          />
        </div>
      </div>

      {/* ── COMPLETED STEPS CHIPS ─────────────────────────── */}
      {completedSteps.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {completedSteps.map((step) => (
            <div
              key={step.key}
              className="flex items-center gap-1.5 rounded-full border border-[#4ade80]/20 bg-[#4ade80]/8 px-3 py-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-[#4ade80]" />
              <span className="text-[12px] font-semibold text-[#4ade80]">
                {mode === "simple" ? step.groomerLabel : step.groomerLabelHindi}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {/* ── ACTIVE STEP FOCUS CARD ────────────────────────── */}
      {activeStep ? (
        <>
          <StepFocusCard
            key={activeStep.key}
            step={activeStep}
            stepNumber={completedSteps.length + 1}
            totalSteps={phaseSteps.length}
            mode={mode}
            busy={busy}
            syncState={stepSyncMap[activeStep.key]}
            coachNote={coachNote}
            coachingSteps={completedSteps.length === 0 ? phase.coachingSteps : []}
            onStepToggle={() => onStepToggle(activeStep.key, activeStep.status)}
            onVideoCapture={() => onVideoCapture(activeStep.key)}
            onPhotoCapture={(file) => onPhotoCapture(activeStep.key, file)}
            onRetry={onRetrySync}
            onSkip={(reason) => onSkip(activeStep.key, reason)}
          />
          {/* ── TIMED COACHING TIPS (shampoo phase etc.) ────── */}
          {phase.timedCoachingTips?.length && minTimeNotReached ? (
            <div className="mt-3 rounded-[20px] bg-[#0a1f0f] border border-[#4ade80]/20 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#4ade80]/60 mb-2">
                {mode === "simple" ? `Tip ${tipIndex + 1} / ${phase.timedCoachingTips.length}` : `टिप ${tipIndex + 1} / ${phase.timedCoachingTips.length}`}
              </div>
              <div className="text-[14px] leading-[1.65] text-[#86efac]">
                {mode === "simple" ? phase.timedCoachingTips[tipIndex] : (phase.timedCoachingTipsHindi?.[tipIndex] ?? phase.timedCoachingTips[tipIndex])}
              </div>
              <div className="mt-2 text-[11px] text-[#4ade80]/40">
                {mode === "simple" ? "Next tip auto-advances every 2 min" : "हर 2 मिनट में अगली टिप आएगी"}
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {/* ── GUIDANCE-ONLY PHASE (no SOP steps) ───────────── */}
      {isGuidanceOnlyPhase ? (
        <div className="rounded-[28px] border border-[#6d5bd0]/30 bg-white p-5 shadow-[0_0_0_1px_rgba(109,91,208,0.12),0_24px_64px_rgba(109,91,208,0.2)]">
          <div className="text-[22px] font-black tracking-[-0.03em] text-[#1f1f2c]">
            {mode === "simple" ? phase.label : phase.labelHindi}
          </div>
          {(resolveNote(coachNote, mode) ?? phase.coachNoteHint) ? (
            <div className="mt-3 rounded-[16px] border border-[#fde68a] bg-[#fffbeb] px-3.5 py-3">
              <div className="mb-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#b45309]">
                {mode === "simple" ? "Note" : "नोट"}
              </div>
              <div className="text-[13px] leading-[1.65] text-[#78350f]">
                {resolveNote(coachNote, mode) ?? (mode === "simple" ? phase.coachNoteHint : phase.coachNoteHintHindi)}
              </div>
            </div>
          ) : null}
          {phase.tasks.length > 0 ? (
            <div className="mt-4 space-y-2">
              <div className="text-[10px] font-black uppercase tracking-[0.12em] text-[#8a90a6]">
                {mode === "simple" ? "Is phase mein karna hai" : "इस चरण में करना है"}
              </div>
              {(mode === "simple" ? phase.tasks : phase.tasksHindi).map((task, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-[12px] border border-[#f3f4f6] bg-[#f9fafb] px-3 py-2.5">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#6d5bd0]" />
                  <span className="text-[13.5px] leading-[1.55] text-[#374151]">{task}</span>
                </div>
              ))}
            </div>
          ) : null}
          {phase.coachingSteps.length > 0 ? (
            <div className="mt-4 rounded-[18px] bg-[#0e0c1a] p-3">
              <GuideAccordion steps={phase.coachingSteps} mode={mode} />
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ── NEXT STEP GHOST PREVIEW ───────────────────────── */}
      {nextStep && !allPhaseSopDone ? (
        <div className="mt-3 rounded-[20px] border border-white/6 bg-white/4 px-4 py-3.5 opacity-50">
          <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white/40">
            {mode === "simple" ? "Next" : "अगला"}
          </div>
          <div className="mt-1 text-[16px] font-bold text-white/50">
            {mode === "simple" ? nextStep.groomerLabel : nextStep.groomerLabelHindi}
          </div>
        </div>
      ) : null}

      {/* ── MIN-TIME WARNING ─────────────────────────────── */}
      {minTimeWarning ? (
        <div className="mt-3 rounded-[18px] border border-[#fde68a]/40 bg-[#fde68a]/8 px-4 py-3.5">
          <div className="text-[14px] font-black text-[#fde68a]">
            {phase.key === "oil_massage"
              ? (mode === "simple" ? "⚠ Oil abhi kaam kar raha hai" : "⚠ ऑयल अभी काम कर रहा है")
              : (mode === "simple" ? "⚠ Shampoo abhi chhod mat" : "⚠ शैम्पू अभी छोड़ो मत")}
          </div>
          <div className="mt-1 text-[12px] leading-[1.6] text-[#fde68a]/70">
            {phase.key === "oil_massage"
              ? (mode === "simple"
                  ? `${Math.ceil((minElapsedSeconds - secondsElapsed) / 60)} min aur ruko — oil coat ko hydrate kar raha hai.`
                  : `${Math.ceil((minElapsedSeconds - secondsElapsed) / 60)} मिनट और रुको — ऑयल coat को hydrate कर रहा है।`)
              : (mode === "simple"
                  ? `${Math.ceil((minElapsedSeconds - secondsElapsed) / 60)} min aur ruko — shampoo achhi tarah lag raha hai.`
                  : `${Math.ceil((minElapsedSeconds - secondsElapsed) / 60)} मिनट और रुको — शैम्पू अच्छी तरह लग रहा है।`)}
          </div>
          <button
            type="button"
            onClick={() => setMinTimeWarning(false)}
            className="mt-2 text-[11px] font-semibold text-[#fde68a]/60 underline underline-offset-2"
          >
            {mode === "simple" ? "Samajh gaya" : "समझ गया"}
          </button>
        </div>
      ) : null}

      {/* ── SPACER ───────────────────────────────────────── */}
      <div className="flex-1" />

      {/* ── BOTTOM CTA ────────────────────────────────────── */}
      <div className="pb-2 pt-4">
        {!allPhaseSopDone && phaseSteps.length > 0 ? (
          <div className="rounded-[14px] border border-[#fde68a]/20 bg-[#fde68a]/6 px-4 py-2.5 text-center text-[12px] text-[#fde68a]/60">
            {mode === "simple"
              ? `${pendingSteps.length} step${pendingSteps.length > 1 ? "s" : ""} baaki — sab complete karo`
              : `${pendingSteps.length} स्टेप बाकी — सब पूरे करो`}
          </div>
        ) : (
          !isLastPhase ? (
            <button
              type="button"
              onClick={handleNextPhase}
              disabled={(!allPhaseSopDone && phaseSteps.length > 0) || busy !== null}
              className="flex h-[56px] w-full items-center justify-center gap-2 rounded-[20px] bg-[linear-gradient(135deg,#6d5bd0,#8b7be7)] text-[16px] font-black text-white shadow-[0_8px_24px_rgba(109,91,208,0.35)] disabled:opacity-40"
            >
              {mode === "simple" ? "Next Phase" : "अगला चरण"}
              <ChevronRight className="h-5 w-5" />
            </button>
          ) : (
            <div className="rounded-[18px] border border-[#4ade80]/20 bg-[#4ade80]/8 px-4 py-3.5 text-center text-[13px] font-semibold text-[#4ade80]">
              {mode === "simple"
                ? "Payment aur review ke baad booking complete karein."
                : "पेमेंट और रिव्यू के बाद बुकिंग पूरी करें।"}
            </div>
          )
        )}
      </div>
    </div>
  );
}
