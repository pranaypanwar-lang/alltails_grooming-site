"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Navigation, ReceiptText, Upload } from "lucide-react";

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

  useEffect(() => {
    void loadExpenses();
    void loadSettings();
    void loadPayroll();
  }, [loadExpenses, loadPayroll, loadSettings]);

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
