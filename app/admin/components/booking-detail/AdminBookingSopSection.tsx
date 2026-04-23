"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { AdminBookingPaymentCollection, AdminBookingSopStep } from "../../types";
import { recordAdminBookingPaymentProof, updateAdminBookingSopStep, uploadAdminBookingSopProof } from "../../lib/api";
import { useAdminToast } from "../common/AdminToastProvider";

function formatProofHint(proofType: AdminBookingSopStep["proofType"]) {
  if (proofType === "manual") return "Manual";
  if (proofType === "image") return "Image proof";
  if (proofType === "video") return "Video proof";
  return "Image or video";
}

type Props = {
  bookingId: string;
  steps: AdminBookingSopStep[];
  paymentMethod: "pay_now" | "pay_after_service" | null;
  expectedAmount: number;
  paymentCollection: AdminBookingPaymentCollection | null;
  onRefresh: () => Promise<void> | void;
};

export function AdminBookingSopSection({
  bookingId,
  steps,
  paymentMethod,
  expectedAmount,
  paymentCollection,
  onRefresh,
}: Props) {
  const { showToast } = useAdminToast();
  const [busyStepKey, setBusyStepKey] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<"cash" | "online" | "waived">(paymentCollection?.collectionMode ?? "cash");
  const [paymentAmount, setPaymentAmount] = useState(
    paymentCollection ? String(paymentCollection.collectedAmount) : String(expectedAmount)
  );
  const [paymentNotes, setPaymentNotes] = useState(paymentCollection?.notes ?? "");
  const [applyServiceAmountChange, setApplyServiceAmountChange] = useState(paymentCollection?.serviceAmountUpdated ?? false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    setPaymentMode(paymentCollection?.collectionMode ?? "cash");
    setPaymentAmount(paymentCollection ? String(paymentCollection.collectedAmount) : String(expectedAmount));
    setPaymentNotes(paymentCollection?.notes ?? "");
    setApplyServiceAmountChange(paymentCollection?.serviceAmountUpdated ?? false);
  }, [expectedAmount, paymentCollection]);

  const handleStatusUpdate = async (stepKey: string, status: "pending" | "completed") => {
    try {
      setBusyStepKey(stepKey);
      await updateAdminBookingSopStep(bookingId, { stepKey, status });
      showToast(
        status === "completed" ? "SOP step marked complete." : "SOP step reset to pending.",
        true
      );
      await onRefresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to update SOP step.", false);
    } finally {
      setBusyStepKey(null);
    }
  };

  const handleFileChange = async (stepKey: string, file: File | null) => {
    if (!file) return;

    try {
      setBusyStepKey(stepKey);
      await uploadAdminBookingSopProof(bookingId, { stepKey, file });
      showToast("SOP proof uploaded.", true);
      await onRefresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to upload SOP proof.", false);
    } finally {
      if (fileInputRefs.current[stepKey]) {
        fileInputRefs.current[stepKey]!.value = "";
      }
      setBusyStepKey(null);
    }
  };

  const handlePaymentProofSave = async () => {
    const collectedAmount = Number(paymentAmount);
    if (!Number.isFinite(collectedAmount) || collectedAmount < 0) {
      showToast("Enter a valid collected amount.", false);
      return;
    }
    if (applyServiceAmountChange && !paymentNotes.trim()) {
      showToast("Add a note explaining the upgrade or downgrade.", false);
      return;
    }

    try {
      setBusyStepKey("payment_proof");
      await recordAdminBookingPaymentProof(bookingId, {
        collectionMode: paymentMode,
        collectedAmount,
        notes: paymentNotes.trim(),
        applyServiceAmountChange,
      });
      showToast("Payment proof recorded.", true);
      await onRefresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to record payment proof.", false);
    } finally {
      setBusyStepKey(null);
    }
  };

  return (
    <div className="rounded-[20px] border border-[#ece5ff] bg-white p-4">
      <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">
        Service SOP
      </div>

      <div className="space-y-3">
        {steps.map((step) => {
          const isBusy = busyStepKey === step.key;
          const isCompleted = step.status === "completed";
          const isPaymentProofStep = step.key === "payment_proof";

          return (
            <div key={step.key} className="rounded-[16px] border border-[#f0ecfa] bg-[#fcfbff] p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-semibold text-[#2a2346]">{step.label}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        isCompleted ? "bg-[#effaf3] text-[#15803d]" : "bg-[#f3f4f6] text-[#4b5563]"
                      }`}
                    >
                      {isCompleted ? "Completed" : "Pending"}
                    </span>
                    {step.requiredForCompletion ? (
                      <span className="rounded-full bg-[#fff8eb] px-2 py-0.5 text-[10px] font-semibold text-[#b45309]">
                        Required
                      </span>
                    ) : null}
                    <span className="rounded-full bg-[#f6f4fd] px-2 py-0.5 text-[10px] font-semibold text-[#6d5bd0]">
                      {formatProofHint(step.proofType)}
                    </span>
                  </div>

                  {step.completedAt ? (
                    <p className="mt-1 text-[11px] text-[#8a90a6]">
                      Completed {new Date(step.completedAt).toLocaleString("en-IN")}
                    </p>
                  ) : (
                    <p className="mt-1 text-[11px] text-[#8a90a6]">
                      {step.proofType === "manual"
                        ? "Mark when ops confirms this stage is done."
                        : "Upload proof to complete this stage automatically."}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {step.proofType === "manual" ? (
                    isCompleted ? (
                      <button
                        type="button"
                        onClick={() => void handleStatusUpdate(step.key, "pending")}
                        disabled={isBusy}
                        className="rounded-[10px] border border-[#ece8f5] px-3 py-1.5 text-[11px] font-semibold text-[#4b5563] hover:bg-[#f6f4fd] disabled:opacity-50"
                      >
                        {isBusy ? "Working…" : "Reset"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleStatusUpdate(step.key, "completed")}
                        disabled={isBusy}
                        className="rounded-[10px] bg-[#6d5bd0] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#5b4ab5] disabled:opacity-50"
                      >
                        {isBusy ? "Working…" : "Mark complete"}
                      </button>
                    )
                  ) : (
                    <>
                      <input
                        ref={(element) => {
                          fileInputRefs.current[step.key] = element;
                        }}
                        type="file"
                        accept={step.proofType === "image" ? "image/*" : step.proofType === "video" ? "video/*" : "image/*,video/*"}
                        className="hidden"
                        onChange={(event) => void handleFileChange(step.key, event.target.files?.[0] ?? null)}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRefs.current[step.key]?.click()}
                        disabled={isBusy}
                        className="rounded-[10px] border border-[#ddd1fb] px-3 py-1.5 text-[11px] font-semibold text-[#6d5bd0] hover:bg-[#f6f4fd] disabled:opacity-50"
                      >
                        {isBusy ? "Uploading…" : "Upload proof"}
                      </button>
                      {isCompleted ? (
                        <button
                          type="button"
                          onClick={() => void handleStatusUpdate(step.key, "pending")}
                          disabled={isBusy}
                          className="rounded-[10px] border border-[#ece8f5] px-3 py-1.5 text-[11px] font-semibold text-[#4b5563] hover:bg-[#f6f4fd] disabled:opacity-50"
                        >
                          Reset
                        </button>
                      ) : null}
                    </>
                  )}
                </div>
              </div>

              {step.notes ? (
                <p className="mt-2 text-[12px] text-[#4b5563]">{step.notes}</p>
              ) : null}

              {isPaymentProofStep ? (
                <div className="mt-3 rounded-[12px] border border-[#ece5ff] bg-white p-3">
                  <div className="grid gap-3 md:grid-cols-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold text-[#8a90a6]">Collection mode</span>
                      <select
                        value={paymentMode}
                        onChange={(event) => setPaymentMode(event.target.value as "cash" | "online" | "waived")}
                        className="h-[40px] rounded-[10px] border border-[#ddd1fb] px-3 text-[12px] outline-none"
                      >
                        <option value="cash">Cash</option>
                        <option value="online">Online</option>
                        <option value="waived">Waived</option>
                      </select>
                    </label>

                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold text-[#8a90a6]">Collected amount</span>
                      <input
                        type="number"
                        min="0"
                        value={paymentAmount}
                        onChange={(event) => setPaymentAmount(event.target.value)}
                        className="h-[40px] rounded-[10px] border border-[#ddd1fb] px-3 text-[12px] outline-none"
                      />
                    </label>

                    <div className="rounded-[10px] border border-[#f0ecfa] bg-[#faf9fd] px-3 py-2">
                      <div className="text-[11px] font-semibold text-[#8a90a6]">Expected amount</div>
                      <div className="mt-1 text-[13px] font-semibold text-[#2a2346]">
                        ₹{expectedAmount.toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>

                  <label className="mt-3 flex flex-col gap-1">
                    <span className="text-[11px] font-semibold text-[#8a90a6]">Notes</span>
                    <textarea
                      value={paymentNotes}
                      onChange={(event) => setPaymentNotes(event.target.value)}
                      rows={2}
                      className="rounded-[10px] border border-[#ddd1fb] px-3 py-2 text-[12px] outline-none"
                      placeholder="Screenshot reference, partial payment note, waiver reason, etc."
                    />
                  </label>

                  <label className="mt-3 block rounded-[10px] border border-[#ece5ff] bg-[#fcfbff] px-3 py-3 text-[12px] text-[#4b5563]">
                    <span className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={applyServiceAmountChange}
                        onChange={(event) => setApplyServiceAmountChange(event.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-[#d8cff8] text-[#6d5bd0] focus:ring-[#c4b5fd]"
                      />
                      <span>
                        <span className="block font-semibold text-[#2a2346]">Apply as service amount change</span>
                        <span className="mt-1 block text-[11px] leading-[1.5] text-[#8a90a6]">
                          Use this when the customer upgraded or downgraded the plan during service. The collected amount will become the new booking final amount.
                        </span>
                      </span>
                    </span>
                  </label>

                  {paymentCollection ? (
                    <div
                      className={`mt-3 rounded-[10px] px-3 py-2 text-[12px] ${
                        paymentCollection.mismatchFlag
                          ? "bg-[#fff1f2] text-[#be123c]"
                          : "bg-[#effaf3] text-[#15803d]"
                      }`}
                    >
                      {paymentCollection.serviceAmountUpdated
                        ? `Service amount updated ${paymentCollection.serviceAmountDirection === "upsell" ? "for upsell" : "for downgrade"}: ₹${paymentCollection.expectedAmount.toLocaleString("en-IN")} → ₹${paymentCollection.collectedAmount.toLocaleString("en-IN")}.`
                        : paymentCollection.mismatchFlag
                        ? `Mismatch flagged: collected ₹${paymentCollection.collectedAmount.toLocaleString("en-IN")} vs expected ₹${paymentCollection.expectedAmount.toLocaleString("en-IN")}.`
                        : `Recorded ₹${paymentCollection.collectedAmount.toLocaleString("en-IN")} via ${paymentCollection.collectionMode}.`}
                    </div>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handlePaymentProofSave()}
                      disabled={isBusy}
                      className="rounded-[10px] bg-[#6d5bd0] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#5b4ab5] disabled:opacity-50"
                    >
                      {isBusy ? "Saving…" : paymentMethod === "pay_after_service" ? "Save payment proof" : "Save payment record"}
                    </button>
                  </div>
                </div>
              ) : null}

              {step.proofs.length ? (
                <div className="mt-3 space-y-2">
                  {step.proofs.map((proof) => (
                    <div
                      key={proof.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-[#ece5ff] bg-white px-3 py-2 text-[12px]"
                    >
                      <div className="flex items-center gap-3">
                        {proof.mimeType.startsWith("image/") ? (
                          <a
                            href={proof.publicUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="relative block h-14 w-14 overflow-hidden rounded-[10px] border border-[#ece5ff]"
                          >
                            <Image
                              src={proof.publicUrl}
                              alt={proof.originalName}
                              fill
                              unoptimized
                              loader={({ src }) => src}
                              className="object-cover"
                              sizes="56px"
                            />
                          </a>
                        ) : proof.mimeType.startsWith("video/") ? (
                          <video
                            src={proof.publicUrl}
                            controls
                            preload="metadata"
                            className="h-14 w-20 rounded-[10px] border border-[#ece5ff] bg-black object-cover"
                          />
                        ) : null}
                        <div>
                        <div className="font-medium text-[#2a2346]">{proof.originalName}</div>
                        <div className="text-[#8a90a6]">
                          {proof.proofType} · {(proof.sizeBytes / (1024 * 1024)).toFixed(1)} MB ·{" "}
                          {new Date(proof.createdAt).toLocaleString("en-IN")}
                        </div>
                        </div>
                      </div>
                      <a
                        href={proof.publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-[10px] border border-[#ece8f5] px-3 py-1.5 font-semibold text-[#6d5bd0] hover:bg-[#f6f4fd]"
                      >
                        Open
                      </a>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
