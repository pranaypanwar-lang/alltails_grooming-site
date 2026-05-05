"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MapPinned, Navigation, ReceiptText, Upload } from "lucide-react";

type GroomerExpense = {
  id: string;
  category: string;
  amount: number;
  billDate: string | null;
  billPhotoUrl: string;
  notes: string | null;
  status: string;
  reviewNote: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  bookingId: string | null;
};

type FinanceSettings = {
  homeAddress: string;
  homeLat: number | null;
  homeLng: number | null;
  bikeAverageKmPerLitre: number;
  fuelRatePerLitre: number;
};

type GroomerPayroll = {
  monthBucket: string;
  baseSalary: number;
  fuelReimbursements: number;
  otherReimbursements: number;
  incentives: number;
  advanceRecovery: number;
  grossCredits: number;
  netPayable: number;
  cashHeldSeparate: number;
  pendingExpenses: number;
  frozenSnapshot: { id: string; frozenAt: string; netPayable: number } | null;
};

type GroomerFuelTrip = {
  id: string;
  bookingId: string;
  bookingDate: string | null;
  bookingService: string | null;
  customerName: string | null;
  serviceAddress: string | null;
  servicePincode: string | null;
  fromType: string;
  distanceKm: number;
  litres: number;
  ratePerLitre: number;
  fuelCost: number;
  isManuallyAdjusted: boolean;
  originalDistanceKm: number | null;
  originalFuelCost: number | null;
  adjustmentReason: string | null;
  adjustmentRequestStatus: string | null;
  requestedDistanceKm: number | null;
  requestedReason: string | null;
  requestedAt: string | null;
  adjustmentReviewedAt: string | null;
  adjustmentReviewNote: string | null;
  calculatedAt: string;
};

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function GroomerFinanceClient({ memberName }: { memberName: string }) {
  const [expenses, setExpenses] = useState<GroomerExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState("wipes");
  const [amount, setAmount] = useState("");
  const [billDate, setBillDate] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [settings, setSettings] = useState<FinanceSettings | null>(null);
  const [homeAddress, setHomeAddress] = useState("");
  const [homeLat, setHomeLat] = useState<number | null>(null);
  const [homeLng, setHomeLng] = useState<number | null>(null);
  const [bikeAverage, setBikeAverage] = useState("35");
  const [fuelRate, setFuelRate] = useState("95");
  const [capturingHome, setCapturingHome] = useState(false);
  const [payroll, setPayroll] = useState<GroomerPayroll | null>(null);
  const [fuelTrips, setFuelTrips] = useState<GroomerFuelTrip[]>([]);
  const [adjustingTripId, setAdjustingTripId] = useState<string | null>(null);
  const [adjustDistance, setAdjustDistance] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/groomer/me/expenses", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Expenses load nahi ho paaye.");
      setExpenses(body.expenses ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Expenses load nahi ho paaye.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/groomer/me/finance-settings", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Settings load nahi ho paayi.");
      const loaded = body.settings as FinanceSettings;
      setSettings(loaded);
      setHomeAddress(loaded.homeAddress ?? "");
      setHomeLat(loaded.homeLat);
      setHomeLng(loaded.homeLng);
      setBikeAverage(String(loaded.bikeAverageKmPerLitre ?? 35));
      setFuelRate(String(loaded.fuelRatePerLitre ?? 95));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Settings load nahi ho paayi.");
    }
  }, []);

  const loadPayroll = useCallback(async () => {
    try {
      const res = await fetch("/api/groomer/me/payroll", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Payroll load nahi ho paaya.");
      setPayroll(body.payroll);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Payroll load nahi ho paaya.");
    }
  }, []);

  const loadFuelTrips = useCallback(async () => {
    try {
      const res = await fetch("/api/groomer/me/fuel-trips", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Fuel trips load nahi ho paaye.");
      setFuelTrips(body.trips ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Fuel trips load nahi ho paaye.");
    }
  }, []);

  useEffect(() => {
    void loadExpenses();
    void loadSettings();
    void loadPayroll();
    void loadFuelTrips();
  }, [loadExpenses, loadFuelTrips, loadPayroll, loadSettings]);

  function startAdjustment(trip: GroomerFuelTrip) {
    setAdjustingTripId(trip.id);
    setAdjustDistance(String(trip.distanceKm));
    setAdjustReason("");
    setError("");
    setSuccess("");
  }

  function cancelAdjustment() {
    setAdjustingTripId(null);
    setAdjustDistance("");
    setAdjustReason("");
  }

  async function submitAdjustment(tripId: string) {
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const requestedDistanceKm = Number(adjustDistance);
      if (!Number.isFinite(requestedDistanceKm) || requestedDistanceKm <= 0) {
        throw new Error("Enter a valid distance in km.");
      }
      if (adjustReason.trim().length < 5) {
        throw new Error("Add a short reason (min 5 characters).");
      }
      const res = await fetch(`/api/groomer/me/fuel-trips/${tripId}/request-adjustment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestedDistanceKm, requestedReason: adjustReason.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Adjustment request submit nahi ho paayi.");
      setSuccess("Adjustment request submit ho gayi. Admin review ke baad fuel update hoga.");
      cancelAdjustment();
      await loadFuelTrips();
      await loadPayroll();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Adjustment request submit nahi ho paayi.");
    } finally {
      setSubmitting(false);
    }
  }

  async function captureHomeLocation() {
    setCapturingHome(true);
    setError("");
    setSuccess("");
    try {
      if (!navigator.geolocation) throw new Error("Location capture is not supported on this browser.");
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60_000,
        });
      });
      setHomeLat(Number(position.coords.latitude.toFixed(7)));
      setHomeLng(Number(position.coords.longitude.toFixed(7)));
      setSuccess("Home location captured. Save settings to use it for fuel estimates.");
    } catch (captureError) {
      setError(captureError instanceof Error ? captureError.message : "Location capture nahi ho paaya.");
    } finally {
      setCapturingHome(false);
    }
  }

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/groomer/me/finance-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeAddress,
          homeLat,
          homeLng,
          bikeAverageKmPerLitre: Number(bikeAverage),
          fuelRatePerLitre: Number(fuelRate),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Settings save nahi ho paayi.");
      setSettings(body.settings);
      setSuccess("Fuel settings saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Settings save nahi ho paayi.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const formData = new FormData();
      formData.set("category", category);
      formData.set("amount", amount);
      if (billDate) formData.set("billDate", billDate);
      if (notes) formData.set("notes", notes);
      if (file) formData.set("file", file);

      const res = await fetch("/api/groomer/me/expenses", {
        method: "POST",
        body: formData,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Expense submit nahi ho paaya.");

      setSuccess("Expense submit ho gaya. Admin approval ke baad reimbursement add hoga.");
      setAmount("");
      setBillDate("");
      setNotes("");
      setFile(null);
      await loadExpenses();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Expense submit nahi ho paaya.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] px-4 py-5">
      <div className="mx-auto max-w-xl space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/groomer" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e4e0f1] bg-white">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="text-right">
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Finance</div>
            <div className="text-[18px] font-black tracking-[-0.02em] text-[#1f1f2c]">{memberName}</div>
          </div>
        </div>

        {error ? <div className="rounded-[8px] bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</div> : null}
        {success ? <div className="rounded-[8px] bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">{success}</div> : null}

        <section className="rounded-[8px] border border-[#e6e1f2] bg-white p-4">
          <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">{payroll?.monthBucket ?? "Current month"}</div>
          <div className="mt-1 text-[28px] font-black tracking-[-0.03em] text-[#1f1f2c]">{formatCurrency(payroll?.netPayable ?? 0)}</div>
          <div className="mt-1 text-[12px] text-[#7c8499]">Expected payout. Cash held is tracked separately.</div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-[8px] bg-[#f8f7fc] p-3"><div className="text-[#7c8499]">Salary</div><div className="font-bold text-[#1f1f2c]">{formatCurrency(payroll?.baseSalary ?? 0)}</div></div>
            <div className="rounded-[8px] bg-[#f8f7fc] p-3"><div className="text-[#7c8499]">Fuel</div><div className="font-bold text-[#1f1f2c]">{formatCurrency(payroll?.fuelReimbursements ?? 0)}</div></div>
            <div className="rounded-[8px] bg-[#f8f7fc] p-3"><div className="text-[#7c8499]">Expenses</div><div className="font-bold text-[#1f1f2c]">{formatCurrency(payroll?.otherReimbursements ?? 0)}</div></div>
            <div className="rounded-[8px] bg-[#fff8eb] p-3"><div className="text-[#a16207]">Cash held</div><div className="font-bold text-[#92400e]">{formatCurrency(payroll?.cashHeldSeparate ?? 0)}</div></div>
          </div>
          {payroll?.frozenSnapshot ? <div className="mt-3 rounded-[8px] bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">Payslip frozen by admin.</div> : null}
        </section>

        <section className="rounded-[8px] border border-[#e6e1f2] bg-white p-4">
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-[#6d5bd0]" />
            <div>
              <div className="text-[16px] font-black tracking-[-0.02em] text-[#1f1f2c]">Fuel settings</div>
              <div className="text-[12px] text-[#7c8499]">Home location is used for your first trip of the day.</div>
            </div>
          </div>
          <form onSubmit={saveSettings} className="mt-4 space-y-3">
            <textarea value={homeAddress} onChange={(event) => setHomeAddress(event.target.value)} placeholder="Home address" className="min-h-[76px] w-full rounded-[8px] border border-[#ddd8eb] px-3 py-2 text-[14px]" />
            <button type="button" onClick={() => void captureHomeLocation()} disabled={capturingHome} className="h-11 w-full rounded-[8px] bg-[#1f1f2c] text-[14px] font-bold text-white disabled:opacity-60">
              {capturingHome ? "Capturing..." : homeLat && homeLng ? "Update home location" : "Capture home location"}
            </button>
            {homeLat && homeLng ? <div className="text-[12px] text-[#7c8499]">Saved point: {homeLat.toFixed(5)}, {homeLng.toFixed(5)}</div> : null}
            <div className="grid grid-cols-2 gap-3">
              <input type="number" min="1" value={bikeAverage} onChange={(event) => setBikeAverage(event.target.value)} placeholder="Bike km/litre" className="h-11 rounded-[8px] border border-[#ddd8eb] px-3 text-[14px]" />
              <input type="number" min="0" value={fuelRate} onChange={(event) => setFuelRate(event.target.value)} placeholder="Fuel ₹/litre" className="h-11 rounded-[8px] border border-[#ddd8eb] px-3 text-[14px]" />
            </div>
            <button disabled={submitting || !homeLat || !homeLng} className="h-11 w-full rounded-[8px] border border-[#6d5bd0] text-[14px] font-bold text-[#6d5bd0] disabled:opacity-60">
              {submitting ? "Saving..." : settings?.homeLat && settings.homeLng ? "Save fuel settings" : "Save home location"}
            </button>
          </form>
        </section>

        <section className="overflow-hidden rounded-[8px] border border-[#e6e1f2] bg-white">
          <div className="flex items-center gap-2 border-b border-[#eeeaf7] px-4 py-3">
            <MapPinned className="h-4 w-4 text-[#6d5bd0]" />
            <div className="flex-1">
              <div className="text-[14px] font-black tracking-[-0.02em] text-[#1f1f2c]">Fuel trips</div>
              <div className="text-[11.5px] text-[#7c8499]">Auto-estimated. Tap a trip to request adjustment if the distance looks wrong.</div>
            </div>
          </div>
          <div className="divide-y divide-[#f0edf8]">
            {fuelTrips.length === 0 ? (
              <div className="px-4 py-8 text-center text-[13px] text-[#7c8499]">No fuel trips yet. Trips appear once your bookings are marked completed.</div>
            ) : (
              fuelTrips.map((trip) => {
                const isAdjusting = adjustingTripId === trip.id;
                const statusBadge =
                  trip.adjustmentRequestStatus === "pending"
                    ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10.5px] font-bold text-amber-700">Pending review</span>
                    : trip.adjustmentRequestStatus === "approved"
                      ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700">Adjusted</span>
                      : trip.adjustmentRequestStatus === "rejected"
                        ? <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10.5px] font-bold text-red-700">Rejected</span>
                        : trip.isManuallyAdjusted
                          ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700">Manual</span>
                          : <span className="rounded-full bg-[#f1eefa] px-2 py-0.5 text-[10.5px] font-bold text-[#6d5bd0]">Auto-estimate</span>;
                return (
                  <div key={trip.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 text-[12.5px] font-semibold text-[#1f1f2c]">
                          <span>{trip.bookingDate ?? new Date(trip.calculatedAt).toLocaleDateString("en-IN")}</span>
                          <span className="text-[#bcb6cf]">•</span>
                          <span>{trip.bookingService ?? "Booking"}</span>
                          <span className="text-[#bcb6cf]">•</span>
                          <span className="font-normal text-[#7c8499]">From {trip.fromType === "home" ? "home" : "previous booking"}</span>
                        </div>
                        <div className="mt-0.5 truncate text-[12px] text-[#7c8499]">
                          {trip.customerName ? `${trip.customerName} · ` : ""}{trip.serviceAddress ?? trip.servicePincode ?? ""}
                        </div>
                        <div className="mt-1.5 text-[13px] font-bold text-[#1f1f2c]">
                          {trip.distanceKm.toFixed(1)} km · {trip.litres.toFixed(2)} L · {formatCurrency(trip.fuelCost)}
                        </div>
                        {trip.adjustmentRequestStatus === "pending" && trip.requestedDistanceKm ? (
                          <div className="mt-1 text-[11.5px] text-amber-700">
                            Requested {trip.requestedDistanceKm.toFixed(1)} km — awaiting review
                          </div>
                        ) : null}
                        {trip.adjustmentRequestStatus === "rejected" && trip.adjustmentReviewNote ? (
                          <div className="mt-1 text-[11.5px] text-red-600">Admin: {trip.adjustmentReviewNote}</div>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        {statusBadge}
                        {trip.adjustmentRequestStatus !== "pending" ? (
                          <button
                            type="button"
                            onClick={() => (isAdjusting ? cancelAdjustment() : startAdjustment(trip))}
                            className="text-[11.5px] font-semibold text-[#6d5bd0] hover:underline"
                          >
                            {isAdjusting ? "Cancel" : "Request adjustment"}
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {isAdjusting ? (
                      <div className="mt-3 space-y-2 rounded-[8px] bg-[#faf9ff] p-3">
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={adjustDistance}
                          onChange={(e) => setAdjustDistance(e.target.value)}
                          placeholder="Actual distance (km)"
                          className="h-10 w-full rounded-[8px] border border-[#ddd8eb] bg-white px-3 text-[13px]"
                        />
                        <textarea
                          value={adjustReason}
                          onChange={(e) => setAdjustReason(e.target.value)}
                          placeholder="Why is the estimate wrong? (e.g. detour, traffic route, multiple stops)"
                          rows={2}
                          className="min-h-[60px] w-full rounded-[8px] border border-[#ddd8eb] bg-white px-3 py-2 text-[13px]"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void submitAdjustment(trip.id)}
                            disabled={submitting}
                            className="h-10 flex-1 rounded-[8px] bg-[#1f1f2c] text-[13px] font-bold text-white disabled:opacity-60"
                          >
                            {submitting ? "Submitting..." : "Submit request"}
                          </button>
                          <button
                            type="button"
                            onClick={cancelAdjustment}
                            className="h-10 rounded-[8px] border border-[#ddd8eb] bg-white px-4 text-[13px] font-semibold text-[#5d5670]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-[8px] border border-[#e6e1f2] bg-white p-4">
          <div className="flex items-center gap-2">
            <ReceiptText className="h-4 w-4 text-[#6d5bd0]" />
            <div>
              <div className="text-[16px] font-black tracking-[-0.02em] text-[#1f1f2c]">Submit expense</div>
              <div className="text-[12px] text-[#7c8499]">Bill photo is required for admin approval.</div>
            </div>
          </div>

          <form onSubmit={submitExpense} className="mt-4 space-y-3">
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-11 w-full rounded-[8px] border border-[#ddd8eb] px-3 text-[14px]">
              <option value="wipes">Wipes</option>
              <option value="equipment">Equipment</option>
              <option value="medicine">Medicine</option>
              <option value="parking">Parking</option>
              <option value="other">Other</option>
            </select>
            <input type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Amount" className="h-11 w-full rounded-[8px] border border-[#ddd8eb] px-3 text-[14px]" required />
            <input type="date" value={billDate} onChange={(event) => setBillDate(event.target.value)} className="h-11 w-full rounded-[8px] border border-[#ddd8eb] px-3 text-[14px]" />
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notes" className="min-h-[88px] w-full rounded-[8px] border border-[#ddd8eb] px-3 py-2 text-[14px]" />
            <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-[8px] border border-dashed border-[#bcb2e7] bg-[#faf9ff] px-3 text-[13px] font-semibold text-[#5d5670]">
              <Upload className="h-4 w-4" />
              <span className="min-w-0 flex-1 truncate">{file ? file.name : "Upload bill photo"}</span>
              <input type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="hidden" required />
            </label>
            <button disabled={submitting} className="h-11 w-full rounded-[8px] bg-[#1f1f2c] text-[14px] font-bold text-white disabled:opacity-60">
              {submitting ? "Submitting..." : "Submit expense"}
            </button>
          </form>
        </section>

        <section className="overflow-hidden rounded-[8px] border border-[#e6e1f2] bg-white">
          <div className="border-b border-[#eeeaf7] px-4 py-3 text-[14px] font-black text-[#1f1f2c]">Recent expenses</div>
          <div className="divide-y divide-[#f0edf8]">
            {loading ? (
              <div className="px-4 py-8 text-center text-[13px] text-[#7c8499]">Loading...</div>
            ) : expenses.length ? expenses.map((expense) => (
              <div key={expense.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[14px] font-bold text-[#1f1f2c]">{expense.category.replace(/_/g, " ")} · {formatCurrency(expense.amount)}</div>
                    <div className="mt-1 text-[12px] text-[#7c8499]">Submitted {new Date(expense.submittedAt).toLocaleDateString("en-IN")}</div>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${expense.status === "approved" ? "bg-emerald-50 text-emerald-700" : expense.status === "rejected" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                    {expense.status}
                  </span>
                </div>
                {expense.reviewNote ? <div className="mt-2 text-[12px] text-[#5d5670]">{expense.reviewNote}</div> : null}
              </div>
            )) : (
              <div className="px-4 py-8 text-center text-[13px] text-[#7c8499]">No expenses submitted yet.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
