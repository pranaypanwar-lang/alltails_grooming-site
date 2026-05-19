"use client";

import { CheckCircle2, Circle } from "lucide-react";
import type { GroomerBookingView } from "../../../../../lib/groomerPortal";

type Props = {
  booking: GroomerBookingView;
  mode: "simple" | "hindi";
  completedStepKeys: string[];
  onComplete: () => void;
  onBack: () => void;
};

export function SOPListReview({ booking, mode, completedStepKeys, onComplete, onBack }: Props) {
  const steps = booking.sopSteps;
  const completedSet = new Set(completedStepKeys);

  const allDone = steps.every((step: { key: string; requiredForCompletion: boolean }) => completedSet.has(step.key) || !step.requiredForCompletion);

  return (
    <div className="min-h-screen bg-[#f8f6ff] px-4 py-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-[28px] font-black tracking-[-0.03em] text-[#1f1f2c]">
            {mode === "simple" ? "Session Review" : "सेशन समीक्षा"}
          </h1>
          <p className="mt-2 text-[14px] text-[#6b7280]">
            {mode === "simple"
              ? "Check all steps are complete"
              : "सभी चरण पूर्ण हैं जाँचें"}
          </p>
        </div>

        {/* SOP Steps List */}
        <div className="space-y-2">
          {steps.map((step: { key: string; requiredForCompletion: boolean; groomerLabel: string; proofType: string }) => {
            const isCompleted = completedSet.has(step.key);
            const isRequired = step.requiredForCompletion;

            return (
              <div
                key={step.key}
                className={`flex items-center gap-3 rounded-[14px] border px-4 py-3 ${
                  isCompleted
                    ? "border-[#bbf7d0] bg-[#f0fdf4]"
                    : isRequired
                    ? "border-[#fecaca] bg-[#fef2f2]"
                    : "border-[#e5e7eb] bg-white"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[#16a34a]" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-[#d1d5db]" />
                )}

                <div className="flex-1 min-w-0">
                  <p className={`text-[14px] font-semibold ${isCompleted ? "text-[#15803d]" : isRequired ? "text-[#991b1b]" : "text-[#4b5563]"}`}>
                    {step.groomerLabel}
                  </p>
                  <p className="text-[12px] text-[#8a90a6]">
                    {mode === "simple" ? `Proof: ${step.proofType}` : `प्रूफ: ${step.proofType}`}
                  </p>
                </div>

                {!isRequired && !isCompleted && (
                  <span className="whitespace-nowrap rounded-full bg-[#f3f4f6] px-2.5 py-1 text-[11px] font-semibold text-[#6b7280]">
                    {mode === "simple" ? "Optional" : "वैकल्पिक"}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Status Message */}
        <div className="mt-6 rounded-[18px] border border-[#ece5ff] bg-[#faf8ff] p-4">
          {allDone ? (
            <p className="text-[14px] leading-[1.6] text-[#15803d]">
              ✓ {mode === "simple" ? "All required steps completed! Ready to finish." : "सभी आवश्यक चरण पूर्ण! समाप्त करने के लिए तैयार।"}
            </p>
          ) : (
            <p className="text-[14px] leading-[1.6] text-[#b91c1c]">
              ⚠ {mode === "simple" ? "Some required steps are pending." : "कुछ आवश्यक चरण लंबित हैं।"}
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 rounded-[16px] border border-[#e5e7eb] bg-white px-4 py-3 text-[14px] font-semibold text-[#6b7280] transition hover:bg-[#f9fafb]"
          >
            {mode === "simple" ? "Go Back" : "वापस जाएं"}
          </button>
          <button
            type="button"
            onClick={onComplete}
            disabled={!allDone}
            className="flex-1 rounded-[16px] bg-[#16a34a] px-4 py-3 text-[14px] font-semibold text-white transition hover:bg-[#15803d] disabled:opacity-50"
          >
            {mode === "simple" ? "Complete Session" : "सेशन पूरा करें"}
          </button>
        </div>
      </div>
    </div>
  );
}
