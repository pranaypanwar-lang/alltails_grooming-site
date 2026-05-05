"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Fuel, IndianRupee, RefreshCw, WalletCards } from "lucide-react";
import { AdminPageHeader } from "../components/common/AdminPageHeader";
import { AdminSummaryCard } from "../components/common/AdminSummaryCard";
import { useAdminToast } from "../components/common/AdminToastProvider";

type FinanceGroomer = {
  id: string;
  name: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  team: { id: string; name: string } | null;
  settings: {
    baseSalary: number;
    salaryEffectiveFromMonth: string | null;
    homeAddress: string | null;
    homeLat: number | null;
    homeLng: number | null;
    bikeAverageKmPerLitre: number;
    fuelRatePerLitre: number;
  };
  cash: {
    held: number;
    collected: number;
    deposited: number;
  };
  recentLedgerEntries: Array<{
    id: string;
    monthBucket: string;
    type: string;
    direction: string;
    amount: number;
    description: string | null;
    occurredAt: string;
    createdBy: string | null;
  }>;
};

type FinanceResponse = {
  summary: {
    groomerCount: number;
    activeGroomerCount: number;
    totalCashHeld: number;
    totalCashCollected: number;
    totalCashDeposited: number;
  };
  groomers: FinanceGroomer[];
};

type FinanceExpense = {
  id: string;
  category: string;
  amount: number;
  billDate: string | null;
  billPhotoUrl: string;
  notes: string | null;
  status: string;
  reviewNote: string | null;
  submittedAt: string;
  groomer: {
    id: string;
    name: string;
    phone: string | null;
    team: { id: string; name: string } | null;
  };
  booking: {
    id: string;
    selectedDate: string | null;
    serviceAddress: string | null;
    servicePincode: string | null;
  } | null;
};

type FuelTripsResponse = {
  summary: {
    tripCount: number;
    estimatedFuelCost: number;
    missingHomeLocationCount: number;
  };
  missingHomeGroomers: Array<{
    id: string;
    name: string;
    phone: string | null;
    team: { id: string; name: string } | null;
  }>;
  fuelTrips: Array<{
    id: string;
    bookingId: string;
    fromType: string;
    distanceKm: number;
    litres: number;
    ratePerLitre: number;
    fuelCost: number;
    isManuallyAdjusted: boolean;
    calculatedAt: string;
    groomer: {
      id: string;
      name: string;
      phone: string | null;
      team: { id: string; name: string } | null;
    };
    booking: {
      id: string;
      selectedDate: string | null;
      serviceAddress: string | null;
      servicePincode: string | null;
    };
  }>;
};

type PayrollResponse = {
  monthBucket: string;
  summary: {
    netPayable: number;
    grossCredits: number;
    advanceRecovery: number;
    cashHeldSeparate: number;
    pendingExpenses: number;
    frozenCount: number;
  };
  rows: Array<{
    groomer: {
      id: string;
      name: string;
      phone: string | null;
      isActive: boolean;
      team: { id: string; name: string } | null;
    };
    baseSalary: number;
    fuelReimbursements: number;
    otherReimbursements: number;
    incentives: number;
    payrollAdjustments: number;
    advanceRecovery: number;
    grossCredits: number;
    netPayable: number;
    cashHeldSeparate: number;
    pendingExpenses: number;
    frozenSnapshot: { id: string; netPayable: number; frozenAt: string } | null;
  }>;
};

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function AdminFinancePage() {
  const { showToast } = useAdminToast();
  const [data, setData] = useState<FinanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [depositMemberId, setDepositMemberId] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositMode, setDepositMode] = useState("cash");
  const [referenceId, setReferenceId] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expenses, setExpenses] = useState<FinanceExpense[]>([]);
  const [expenseLoading, setExpenseLoading] = useState(true);
  const [reviewingExpenseId, setReviewingExpenseId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [fuelData, setFuelData] = useState<FuelTripsResponse | null>(null);
  const [fuelLoading, setFuelLoading] = useState(true);
  const [payrollData, setPayrollData] = useState<PayrollResponse | null>(null);
  const [payrollLoading, setPayrollLoading] = useState(true);
  const [freezingPayrollId, setFreezingPayrollId] = useState<string | null>(null);
  const [settingsMemberId, setSettingsMemberId] = useState("");
  const [settingsForm, setSettingsForm] = useState({
    baseSalary: "",
    salaryEffectiveFromMonth: "",
    homeAddress: "",
    homeLat: "",
    homeLng: "",
    bikeAverageKmPerLitre: "35",
    fuelRatePerLitre: "95",
  });
  const [adjustmentForm, setAdjustmentForm] = useState({
    groomerMemberId: "",
    kind: "incentive",
    direction: "credit",
    amount: "",
    description: "",
  });

  const loadFinance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/finance/groomers", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Failed to load finance data");
      setData(body);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to load finance data", false);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadExpenses = useCallback(async () => {
    setExpenseLoading(true);
    try {
      const res = await fetch("/api/admin/finance/expenses?status=pending", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Failed to load expenses");
      setExpenses(body.expenses ?? []);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to load expenses", false);
    } finally {
      setExpenseLoading(false);
    }
  }, [showToast]);

  const loadFuelTrips = useCallback(async () => {
    setFuelLoading(true);
    try {
      const res = await fetch("/api/admin/finance/fuel-trips", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Failed to load fuel trips");
      setFuelData(body);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to load fuel trips", false);
    } finally {
      setFuelLoading(false);
    }
  }, [showToast]);

  const loadPayroll = useCallback(async () => {
    setPayrollLoading(true);
    try {
      const res = await fetch("/api/admin/finance/payroll", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Failed to load payroll");
      setPayrollData(body);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to load payroll", false);
    } finally {
      setPayrollLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadFinance();
    void loadExpenses();
    void loadFuelTrips();
    void loadPayroll();
  }, [loadExpenses, loadFinance, loadFuelTrips, loadPayroll]);

  const selectedGroomer = useMemo(
    () => data?.groomers.find((groomer) => groomer.id === depositMemberId) ?? null,
    [data?.groomers, depositMemberId]
  );

  async function submitDeposit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/finance/cash-deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groomerMemberId: depositMemberId,
          amount: Number(depositAmount),
          depositMode,
          referenceId,
          notes,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Failed to record deposit");
      showToast("Cash deposit recorded.", true);
      setDepositAmount("");
      setReferenceId("");
      setNotes("");
      await loadFinance();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to record deposit", false);
    } finally {
      setSubmitting(false);
    }
  }

  async function reviewExpense(expenseId: string, status: "approved" | "rejected") {
    setReviewingExpenseId(expenseId);
    try {
      const res = await fetch(`/api/admin/finance/expenses/${expenseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          reviewNote: reviewNotes[expenseId] ?? "",
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Failed to review expense");
      showToast(status === "approved" ? "Expense approved." : "Expense rejected.", true);
      await Promise.all([loadExpenses(), loadFinance()]);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to review expense", false);
    } finally {
      setReviewingExpenseId(null);
    }
  }

  async function freezePayroll(groomerMemberId: string) {
    setFreezingPayrollId(groomerMemberId);
    try {
      const row = payrollData?.rows.find((item) => item.groomer.id === groomerMemberId);
      const notes = row?.frozenSnapshot ? window.prompt("Refreeze note is required")?.trim() : "";
      if (row?.frozenSnapshot && !notes) return;
      const res = await fetch("/api/admin/finance/payroll/freeze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groomerMemberId,
          monthBucket: payrollData?.monthBucket,
          notes,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Failed to freeze payroll");
      showToast("Payroll snapshot frozen.", true);
      await loadPayroll();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to freeze payroll", false);
    } finally {
      setFreezingPayrollId(null);
    }
  }

  async function freezeAllPayroll() {
    if (payrollData?.summary.pendingExpenses || payrollData?.summary.cashHeldSeparate) {
      const ok = window.confirm("This month still has pending expenses or cash held. Freeze all anyway?");
      if (!ok) return;
    }
    setFreezingPayrollId("all");
    try {
      const res = await fetch("/api/admin/finance/payroll/freeze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthBucket: payrollData?.monthBucket, notes: "Bulk freeze" }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Failed to freeze payroll");
      showToast(`Frozen ${body.count ?? 0} payroll snapshots.`, true);
      await loadPayroll();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to freeze payroll", false);
    } finally {
      setFreezingPayrollId(null);
    }
  }

  function loadSettingsForm(memberId: string) {
    const groomer = data?.groomers.find((item) => item.id === memberId);
    setSettingsMemberId(memberId);
    if (!groomer) return;
    setSettingsForm({
      baseSalary: String(groomer.settings.baseSalary ?? 0),
      salaryEffectiveFromMonth: groomer.settings.salaryEffectiveFromMonth ?? payrollData?.monthBucket ?? "",
      homeAddress: groomer.settings.homeAddress ?? "",
      homeLat: groomer.settings.homeLat == null ? "" : String(groomer.settings.homeLat),
      homeLng: groomer.settings.homeLng == null ? "" : String(groomer.settings.homeLng),
      bikeAverageKmPerLitre: String(groomer.settings.bikeAverageKmPerLitre ?? 35),
      fuelRatePerLitre: String(groomer.settings.fuelRatePerLitre ?? 95),
    });
  }

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settingsMemberId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/finance/groomers/${settingsMemberId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settingsForm,
          baseSalary: Number(settingsForm.baseSalary),
          homeLat: settingsForm.homeLat ? Number(settingsForm.homeLat) : null,
          homeLng: settingsForm.homeLng ? Number(settingsForm.homeLng) : null,
          bikeAverageKmPerLitre: Number(settingsForm.bikeAverageKmPerLitre),
          fuelRatePerLitre: Number(settingsForm.fuelRatePerLitre),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Failed to save settings");
      showToast("Groomer finance settings saved.", true);
      await Promise.all([loadFinance(), loadPayroll(), loadFuelTrips()]);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to save settings", false);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitAdjustment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/finance/ledger-adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...adjustmentForm,
          amount: Number(adjustmentForm.amount),
          monthBucket: payrollData?.monthBucket,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Failed to create adjustment");
      showToast("Finance adjustment added.", true);
      setAdjustmentForm((prev) => ({ ...prev, amount: "", description: "" }));
      await loadPayroll();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to create adjustment", false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Groomer finance"
        subtitle="Cash held is tracked separately from salary. Use deposits to settle groomer cash balances."
      />

      <div className="grid gap-3 md:grid-cols-4">
        <AdminSummaryCard label="Cash held" value={data ? formatCurrency(data.summary.totalCashHeld) : "—"} tone="warning" />
        <AdminSummaryCard label="Cash collected" value={data ? formatCurrency(data.summary.totalCashCollected) : "—"} />
        <AdminSummaryCard label="Cash deposited" value={data ? formatCurrency(data.summary.totalCashDeposited) : "—"} tone="success" />
        <AdminSummaryCard label="Pending expenses" value={expenseLoading ? "—" : expenses.length} />
        <AdminSummaryCard label="Fuel estimates" value={fuelData ? formatCurrency(fuelData.summary.estimatedFuelCost) : "—"} tone="success" />
        <AdminSummaryCard label="Payroll payable" value={payrollData ? formatCurrency(payrollData.summary.netPayable) : "—"} />
      </div>

      <section className="overflow-hidden rounded-[8px] border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div>
            <div className="text-sm font-bold text-gray-950">Monthly payroll</div>
            <div className="text-xs text-gray-500">Read-only summary for {payrollData?.monthBucket ?? "current month"}. Cash held is shown separately.</div>
          </div>
          <div className="flex items-center gap-2">
            {(payrollData?.summary.pendingExpenses || payrollData?.summary.cashHeldSeparate) ? (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">Warnings active</span>
            ) : null}
            <button type="button" onClick={() => void freezeAllPayroll()} disabled={freezingPayrollId === "all"} className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-gray-900 bg-gray-950 px-3 text-xs font-semibold text-white disabled:opacity-60">
              {freezingPayrollId === "all" ? "Freezing..." : "Freeze all"}
            </button>
            <button type="button" onClick={() => void loadPayroll()} className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-gray-200 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
        </div>
        {payrollData?.summary.pendingExpenses ? (
          <div className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-800">Pending expenses total {formatCurrency(payrollData.summary.pendingExpenses)}. Review before final payroll where possible.</div>
        ) : null}
        {payrollData?.summary.cashHeldSeparate ? (
          <div className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-800">Cash held total {formatCurrency(payrollData.summary.cashHeldSeparate)}. This is separate from payroll payable.</div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-bold uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Groomer</th>
                <th className="px-4 py-3 text-right">Salary</th>
                <th className="px-4 py-3 text-right">Fuel</th>
                <th className="px-4 py-3 text-right">Expenses</th>
                <th className="px-4 py-3 text-right">Adjust</th>
                <th className="px-4 py-3 text-right">Advance</th>
                <th className="px-4 py-3 text-right">Net payable</th>
                <th className="px-4 py-3 text-right">Cash held</th>
                <th className="px-4 py-3">Freeze</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payrollLoading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">Loading payroll...</td></tr>
              ) : payrollData?.rows.length ? payrollData.rows.map((row) => (
                <tr key={row.groomer.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-950">{row.groomer.name}</div>
                    <div className="text-xs text-gray-500">{row.groomer.team?.name ?? "No team"}</div>
                  </td>
                  <td className="px-4 py-3 text-right">{formatCurrency(row.baseSalary)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(row.fuelReimbursements)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(row.otherReimbursements)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(row.payrollAdjustments)}</td>
                  <td className="px-4 py-3 text-right text-red-700">{formatCurrency(row.advanceRecovery)}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-950">{formatCurrency(row.netPayable)}</td>
                  <td className="px-4 py-3 text-right text-amber-700">{formatCurrency(row.cashHeldSeparate)}</td>
                  <td className="px-4 py-3">
                    <button type="button" disabled={freezingPayrollId === row.groomer.id} onClick={() => void freezePayroll(row.groomer.id)} className="h-8 rounded-[8px] border border-gray-200 px-3 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
                      {row.frozenSnapshot ? "Refreeze" : freezingPayrollId === row.groomer.id ? "Freezing..." : "Freeze"}
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">No payroll rows.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-[8px] border border-gray-200 bg-white p-4">
          <div className="text-sm font-bold text-gray-950">Salary and fuel settings</div>
          <form onSubmit={saveSettings} className="mt-4 grid gap-3 md:grid-cols-2">
            <select value={settingsMemberId} onChange={(event) => loadSettingsForm(event.target.value)} className="h-10 rounded-[8px] border border-gray-200 px-3 text-sm md:col-span-2" required>
              <option value="">Select groomer</option>
              {data?.groomers.map((groomer) => <option key={groomer.id} value={groomer.id}>{groomer.name}</option>)}
            </select>
            <input type="number" min="0" value={settingsForm.baseSalary} onChange={(event) => setSettingsForm((prev) => ({ ...prev, baseSalary: event.target.value }))} placeholder="Base salary" className="h-10 rounded-[8px] border border-gray-200 px-3 text-sm" />
            <input value={settingsForm.salaryEffectiveFromMonth} onChange={(event) => setSettingsForm((prev) => ({ ...prev, salaryEffectiveFromMonth: event.target.value }))} placeholder="YYYY-MM" className="h-10 rounded-[8px] border border-gray-200 px-3 text-sm" />
            <textarea value={settingsForm.homeAddress} onChange={(event) => setSettingsForm((prev) => ({ ...prev, homeAddress: event.target.value }))} placeholder="Home address" className="min-h-[76px] rounded-[8px] border border-gray-200 px-3 py-2 text-sm md:col-span-2" />
            <input value={settingsForm.homeLat} onChange={(event) => setSettingsForm((prev) => ({ ...prev, homeLat: event.target.value }))} placeholder="Home latitude" className="h-10 rounded-[8px] border border-gray-200 px-3 text-sm" />
            <input value={settingsForm.homeLng} onChange={(event) => setSettingsForm((prev) => ({ ...prev, homeLng: event.target.value }))} placeholder="Home longitude" className="h-10 rounded-[8px] border border-gray-200 px-3 text-sm" />
            <input type="number" min="1" value={settingsForm.bikeAverageKmPerLitre} onChange={(event) => setSettingsForm((prev) => ({ ...prev, bikeAverageKmPerLitre: event.target.value }))} placeholder="Bike km/litre" className="h-10 rounded-[8px] border border-gray-200 px-3 text-sm" />
            <input type="number" min="0" value={settingsForm.fuelRatePerLitre} onChange={(event) => setSettingsForm((prev) => ({ ...prev, fuelRatePerLitre: event.target.value }))} placeholder="Fuel rate" className="h-10 rounded-[8px] border border-gray-200 px-3 text-sm" />
            <button disabled={submitting || !settingsMemberId} className="h-10 rounded-[8px] bg-gray-950 text-sm font-bold text-white disabled:opacity-60 md:col-span-2">Save settings</button>
          </form>
        </section>

        <section className="rounded-[8px] border border-gray-200 bg-white p-4">
          <div className="text-sm font-bold text-gray-950">Manual incentive or adjustment</div>
          <form onSubmit={submitAdjustment} className="mt-4 grid gap-3 md:grid-cols-2">
            <select value={adjustmentForm.groomerMemberId} onChange={(event) => setAdjustmentForm((prev) => ({ ...prev, groomerMemberId: event.target.value }))} className="h-10 rounded-[8px] border border-gray-200 px-3 text-sm md:col-span-2" required>
              <option value="">Select groomer</option>
              {data?.groomers.map((groomer) => <option key={groomer.id} value={groomer.id}>{groomer.name}</option>)}
            </select>
            <select value={adjustmentForm.kind} onChange={(event) => setAdjustmentForm((prev) => ({ ...prev, kind: event.target.value, direction: event.target.value === "incentive" ? "credit" : prev.direction }))} className="h-10 rounded-[8px] border border-gray-200 px-3 text-sm">
              <option value="incentive">Incentive</option>
              <option value="payroll_adjustment">Payroll adjustment</option>
            </select>
            <select value={adjustmentForm.direction} onChange={(event) => setAdjustmentForm((prev) => ({ ...prev, direction: event.target.value }))} disabled={adjustmentForm.kind === "incentive"} className="h-10 rounded-[8px] border border-gray-200 px-3 text-sm disabled:bg-gray-50">
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
            </select>
            <input type="number" min="1" value={adjustmentForm.amount} onChange={(event) => setAdjustmentForm((prev) => ({ ...prev, amount: event.target.value }))} placeholder="Amount" className="h-10 rounded-[8px] border border-gray-200 px-3 text-sm md:col-span-2" required />
            <textarea value={adjustmentForm.description} onChange={(event) => setAdjustmentForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Reason" className="min-h-[76px] rounded-[8px] border border-gray-200 px-3 py-2 text-sm md:col-span-2" required />
            <button disabled={submitting} className="h-10 rounded-[8px] bg-gray-950 text-sm font-bold text-white disabled:opacity-60 md:col-span-2">Add ledger entry</button>
          </form>
        </section>
      </div>

      <section className="overflow-hidden rounded-[8px] border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <Fuel className="h-4 w-4 text-gray-700" />
            <div>
              <div className="text-sm font-bold text-gray-950">Fuel estimates</div>
              <div className="text-xs text-gray-500">Auto-created on booking completion when coordinates are available.</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadFuelTrips()}
            className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-gray-200 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
        {fuelData?.missingHomeGroomers.length ? (
          <div className="border-b border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            Missing home location: {fuelData.missingHomeGroomers.map((groomer) => groomer.name).join(", ")}
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-bold uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Groomer</th>
                <th className="px-4 py-3">Booking</th>
                <th className="px-4 py-3">Origin</th>
                <th className="px-4 py-3 text-right">Distance</th>
                <th className="px-4 py-3 text-right">Fuel</th>
                <th className="px-4 py-3 text-right">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {fuelLoading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading fuel estimates...</td></tr>
              ) : fuelData?.fuelTrips.length ? fuelData.fuelTrips.slice(0, 12).map((trip) => (
                <tr key={trip.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-950">{trip.groomer.name}</div>
                    <div className="text-xs text-gray-500">{trip.groomer.team?.name ?? "No team"}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{trip.booking.selectedDate ?? trip.bookingId}</td>
                  <td className="px-4 py-3 text-gray-600">{trip.fromType.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{trip.distanceKm.toFixed(2)} km</td>
                  <td className="px-4 py-3 text-right text-gray-700">{trip.litres.toFixed(2)} L</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-700">{formatCurrency(trip.fuelCost)}</td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No fuel trips yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-[8px] border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div>
            <div className="text-sm font-bold text-gray-950">Expense approvals</div>
            <div className="text-xs text-gray-500">Approved bills become reimbursement credits in the groomer ledger.</div>
          </div>
          <button
            type="button"
            onClick={() => void loadExpenses()}
            className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-gray-200 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
        <div className="divide-y divide-gray-100">
          {expenseLoading ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">Loading expense approvals...</div>
          ) : expenses.length ? expenses.map((expense) => (
            <div key={expense.id} className="grid gap-3 px-4 py-4 lg:grid-cols-[1fr_180px_280px]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-gray-950">{expense.groomer.name}</span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">{expense.category.replace(/_/g, " ")}</span>
                  <span className="text-sm font-bold text-gray-950">{formatCurrency(expense.amount)}</span>
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {expense.groomer.team?.name ?? "No team"} · Submitted {new Date(expense.submittedAt).toLocaleDateString("en-IN")}
                  {expense.booking ? ` · Booking ${expense.booking.selectedDate ?? expense.booking.id}` : ""}
                </div>
                {expense.notes ? <div className="mt-2 text-sm text-gray-700">{expense.notes}</div> : null}
              </div>
              <a
                href={expense.billPhotoUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center justify-center rounded-[8px] border border-gray-200 px-3 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                View bill
              </a>
              <div className="space-y-2">
                <textarea
                  value={reviewNotes[expense.id] ?? ""}
                  onChange={(event) => setReviewNotes((prev) => ({ ...prev, [expense.id]: event.target.value }))}
                  placeholder="Review note"
                  className="min-h-[70px] w-full rounded-[8px] border border-gray-200 px-3 py-2 text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={reviewingExpenseId === expense.id}
                    onClick={() => void reviewExpense(expense.id, "rejected")}
                    className="h-9 rounded-[8px] border border-red-200 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    disabled={reviewingExpenseId === expense.id}
                    onClick={() => void reviewExpense(expense.id, "approved")}
                    className="h-9 rounded-[8px] bg-gray-950 text-xs font-bold text-white disabled:opacity-60"
                  >
                    Approve
                  </button>
                </div>
              </div>
            </div>
          )) : (
            <div className="px-4 py-8 text-center text-sm text-gray-500">No pending expenses.</div>
          )}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <section className="overflow-hidden rounded-[8px] border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <div>
              <div className="text-sm font-bold text-gray-950">Cash balances</div>
              <div className="text-xs text-gray-500">Completed cash collections minus deposits recorded by admin.</div>
            </div>
            <button
              type="button"
              onClick={() => void loadFinance()}
              className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-gray-200 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-bold uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Groomer</th>
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3 text-right">Held</th>
                  <th className="px-4 py-3 text-right">Collected</th>
                  <th className="px-4 py-3 text-right">Deposited</th>
                  <th className="px-4 py-3">Latest movement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading finance balances...</td></tr>
                ) : data?.groomers.length ? data.groomers.map((groomer) => {
                  const latest = groomer.recentLedgerEntries[0];
                  return (
                    <tr key={groomer.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-950">{groomer.name}</div>
                        <div className="text-xs text-gray-500">{groomer.phone ?? "No phone"} · {groomer.isActive ? "Active" : "Inactive"}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{groomer.team?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-right font-bold text-amber-700">{formatCurrency(groomer.cash.held)}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(groomer.cash.collected)}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(groomer.cash.deposited)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {latest ? `${latest.type.replace(/_/g, " ")} · ${formatCurrency(latest.amount)}` : "No ledger entries"}
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No groomers found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="rounded-[8px] border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-950">
            <WalletCards className="h-4 w-4" />
            Record cash deposit
          </div>
          <form onSubmit={submitDeposit} className="mt-4 space-y-3">
            <label className="block text-xs font-semibold text-gray-600">
              Groomer
              <select
                value={depositMemberId}
                onChange={(event) => setDepositMemberId(event.target.value)}
                className="mt-1 h-10 w-full rounded-[8px] border border-gray-200 px-3 text-sm"
                required
              >
                <option value="">Select groomer</option>
                {data?.groomers.map((groomer) => (
                  <option key={groomer.id} value={groomer.id}>{groomer.name}</option>
                ))}
              </select>
            </label>
            {selectedGroomer ? (
              <div className="rounded-[8px] bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Current cash held: <span className="font-bold">{formatCurrency(selectedGroomer.cash.held)}</span>
              </div>
            ) : null}
            <label className="block text-xs font-semibold text-gray-600">
              Amount
              <div className="mt-1 flex h-10 items-center rounded-[8px] border border-gray-200 px-3">
                <IndianRupee className="h-3.5 w-3.5 text-gray-400" />
                <input
                  type="number"
                  min="1"
                  value={depositAmount}
                  onChange={(event) => setDepositAmount(event.target.value)}
                  className="h-full min-w-0 flex-1 px-2 text-sm outline-none"
                  required
                />
              </div>
            </label>
            <label className="block text-xs font-semibold text-gray-600">
              Deposit mode
              <select value={depositMode} onChange={(event) => setDepositMode(event.target.value)} className="mt-1 h-10 w-full rounded-[8px] border border-gray-200 px-3 text-sm">
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="bank_transfer">Bank transfer</option>
              </select>
            </label>
            <label className="block text-xs font-semibold text-gray-600">
              Reference
              <input value={referenceId} onChange={(event) => setReferenceId(event.target.value)} className="mt-1 h-10 w-full rounded-[8px] border border-gray-200 px-3 text-sm" />
            </label>
            <label className="block text-xs font-semibold text-gray-600">
              Notes
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 min-h-[82px] w-full rounded-[8px] border border-gray-200 px-3 py-2 text-sm" />
            </label>
            <button disabled={submitting} className="h-10 w-full rounded-[8px] bg-gray-950 text-sm font-bold text-white disabled:opacity-60">
              {submitting ? "Recording..." : "Record deposit"}
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
