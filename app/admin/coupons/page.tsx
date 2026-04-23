"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "../components/common/AdminPageHeader";
import { AdminSummaryCard } from "../components/common/AdminSummaryCard";
import { useAdminToast } from "../components/common/AdminToastProvider";
import {
  createAdminCoupon,
  fetchAdminBookingCreateMeta,
  fetchAdminCoupons,
  updateAdminCoupon,
} from "../lib/api";
import type {
  AdminBookingCreateMetaResponse,
  AdminCoupon,
  AdminCouponPayload,
} from "../types";

const DISCOUNT_TYPE_OPTIONS = [
  { value: "percent", label: "Percent off" },
  { value: "flat", label: "Flat amount off" },
  { value: "per_extra_pet_percent", label: "Percent off per extra pet" },
] as const;

const PAYMENT_METHOD_OPTIONS = [
  { value: "pay_now", label: "Pay now" },
  { value: "pay_after_service", label: "Pay after service" },
] as const;

type CouponFormState = {
  id: string | null;
  code: string;
  title: string;
  description: string;
  isActive: boolean;
  discountType: AdminCouponPayload["discountType"];
  discountValue: string;
  maxDiscountAmount: string;
  stackable: boolean;
  firstBookingOnly: boolean;
  applicableServiceNames: string[];
  applicableCities: string[];
  paymentMethods: Array<"pay_now" | "pay_after_service">;
};

function createEmptyForm(): CouponFormState {
  return {
    id: null,
    code: "",
    title: "",
    description: "",
    isActive: true,
    discountType: "percent",
    discountValue: "",
    maxDiscountAmount: "",
    stackable: false,
    firstBookingOnly: false,
    applicableServiceNames: [],
    applicableCities: [],
    paymentMethods: ["pay_now"],
  };
}

function buildPayload(form: CouponFormState): AdminCouponPayload {
  return {
    code: form.code.trim().toUpperCase(),
    title: form.title.trim(),
    description: form.description.trim(),
    isActive: form.isActive,
    discountType: form.discountType,
    discountValue: Number(form.discountValue),
    maxDiscountAmount: form.maxDiscountAmount.trim() ? Number(form.maxDiscountAmount) : null,
    stackable: form.stackable,
    firstBookingOnly: form.firstBookingOnly,
    applicableServiceNames: form.applicableServiceNames,
    applicableCities: form.applicableCities,
    paymentMethods: form.paymentMethods,
  };
}

export default function AdminCouponsPage() {
  const { showToast } = useAdminToast();
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [meta, setMeta] = useState<AdminBookingCreateMetaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<CouponFormState>(createEmptyForm());

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [couponData, metaData] = await Promise.all([
          fetchAdminCoupons(),
          fetchAdminBookingCreateMeta(),
        ]);
        setCoupons(couponData.coupons);
        setMeta(metaData);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load coupons.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const activeCount = useMemo(() => coupons.filter((coupon) => coupon.isActive).length, [coupons]);
  const stackableCount = useMemo(() => coupons.filter((coupon) => coupon.stackable).length, [coupons]);
  const totalRedemptions = useMemo(
    () => coupons.reduce((sum, coupon) => sum + coupon.usageCount, 0),
    [coupons]
  );

  const resetForm = () => setForm(createEmptyForm());

  const beginEdit = (coupon: AdminCoupon) => {
    setForm({
      id: coupon.id,
      code: coupon.code,
      title: coupon.title,
      description: coupon.description ?? "",
      isActive: coupon.isActive,
      discountType: coupon.discountType,
      discountValue: String(coupon.discountValue),
      maxDiscountAmount: coupon.maxDiscountAmount ? String(coupon.maxDiscountAmount) : "",
      stackable: coupon.stackable,
      firstBookingOnly: coupon.firstBookingOnly,
      applicableServiceNames: coupon.applicableServiceNames,
      applicableCities: coupon.applicableCities,
      paymentMethods: coupon.paymentMethods,
    });
  };

  const toggleStringListValue = (
    key: "applicableServiceNames" | "applicableCities",
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter((entry) => entry !== value)
        : [...current[key], value],
    }));
  };

  const togglePaymentMethod = (value: "pay_now" | "pay_after_service") => {
    setForm((current) => ({
      ...current,
      paymentMethods: current.paymentMethods.includes(value)
        ? current.paymentMethods.filter((entry) => entry !== value)
        : [...current.paymentMethods, value],
    }));
  };

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = buildPayload(form);
      const response = form.id
        ? await updateAdminCoupon(form.id, payload)
        : await createAdminCoupon(payload);

      setCoupons((current) => {
        const existingIndex = current.findIndex((coupon) => coupon.id === response.coupon.id);
        if (existingIndex >= 0) {
          return current.map((coupon) =>
            coupon.id === response.coupon.id ? response.coupon : coupon
          );
        }
        return [response.coupon, ...current].sort((a, b) => a.code.localeCompare(b.code));
      });
      showToast(form.id ? "Coupon updated." : "Coupon created.", true);
      resetForm();
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Failed to save coupon.";
      setError(message);
      showToast(message, false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7fb]">
      <div className="mx-auto max-w-[1200px] px-4 py-6 md:px-6 lg:px-8">
        <AdminPageHeader
          title="Coupons"
          subtitle="Create, scope, and manage stackable coupon codes by package, city, and first-booking eligibility."
        />

        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <AdminSummaryCard label="Total coupons" value={coupons.length} />
          <AdminSummaryCard label="Active" value={activeCount} tone="success" />
          <AdminSummaryCard label="Total redemptions" value={totalRedemptions} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <section className="rounded-[24px] border border-[#ece5ff] bg-white p-6 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[22px] font-black tracking-[-0.03em] text-[#1f1f2c]">
                  {form.id ? "Edit coupon" : "Create coupon"}
                </h2>
                <p className="mt-1 text-[13px] leading-[1.7] text-[#7b8198]">
                  Use comma-free codes like <span className="font-semibold text-[#55458f]">FIRST10</span> or
                  <span className="font-semibold text-[#55458f]"> COMPLETE10</span>.
                </p>
              </div>
              {form.id ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-[12px] border border-[#ddd1fb] px-3 py-2 text-[12px] font-semibold text-[#6d5bd0]"
                >
                  Clear
                </button>
              ) : null}
            </div>

            <div className="mt-5 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Code</span>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
                    className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] uppercase outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Title</span>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                    className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Description</span>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  className="rounded-[14px] border border-[#ddd1fb] px-4 py-3 text-[13px] outline-none"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Discount type</span>
                  <select
                    value={form.discountType}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        discountType: event.target.value as CouponFormState["discountType"],
                      }))
                    }
                    className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none"
                  >
                    {DISCOUNT_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Value</span>
                  <input
                    type="number"
                    min="1"
                    value={form.discountValue}
                    onChange={(event) => setForm((current) => ({ ...current, discountValue: event.target.value }))}
                    className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Max discount</span>
                  <input
                    type="number"
                    min="1"
                    value={form.maxDiscountAmount}
                    onChange={(event) => setForm((current) => ({ ...current, maxDiscountAmount: event.target.value }))}
                    placeholder="Optional"
                    className="h-[44px] rounded-[14px] border border-[#ddd1fb] px-4 text-[13px] outline-none"
                  />
                </label>
              </div>

              <div className="grid gap-4 rounded-[18px] border border-[#ece5ff] bg-[#fbf9ff] p-4 sm:grid-cols-3">
                <label className="flex items-center gap-3 text-[13px] font-semibold text-[#463a75]">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                  />
                  Active
                </label>
                <label className="flex items-center gap-3 text-[13px] font-semibold text-[#463a75]">
                  <input
                    type="checkbox"
                    checked={form.stackable}
                    onChange={(event) => setForm((current) => ({ ...current, stackable: event.target.checked }))}
                  />
                  Stackable
                </label>
                <label className="flex items-center gap-3 text-[13px] font-semibold text-[#463a75]">
                  <input
                    type="checkbox"
                    checked={form.firstBookingOnly}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, firstBookingOnly: event.target.checked }))
                    }
                  />
                  First booking only
                </label>
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Payment methods</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PAYMENT_METHOD_OPTIONS.map((option) => {
                    const selected = form.paymentMethods.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => togglePaymentMethod(option.value)}
                        className={`rounded-[14px] border px-4 py-2 text-[12px] font-semibold transition ${
                          selected
                            ? "border-[#6d5bd0] bg-[#f6f3ff] text-[#6d5bd0]"
                            : "border-[#ddd1fb] bg-white text-[#4f477f]"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Packages</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {meta?.services.map((service) => {
                    const selected = form.applicableServiceNames.includes(service.name);
                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => toggleStringListValue("applicableServiceNames", service.name)}
                        className={`rounded-[14px] border px-4 py-2 text-[12px] font-semibold transition ${
                          selected
                            ? "border-[#6d5bd0] bg-[#f6f3ff] text-[#6d5bd0]"
                            : "border-[#ddd1fb] bg-white text-[#4f477f]"
                        }`}
                      >
                        {service.name}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[12px] text-[#7c8499]">Leave empty to allow all packages.</p>
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Cities</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {meta?.serviceAreas.map((area) => {
                    const selected = form.applicableCities.includes(area.name);
                    return (
                      <button
                        key={area.id}
                        type="button"
                        onClick={() => toggleStringListValue("applicableCities", area.name)}
                        className={`rounded-[14px] border px-4 py-2 text-[12px] font-semibold transition ${
                          selected
                            ? "border-[#6d5bd0] bg-[#f6f3ff] text-[#6d5bd0]"
                            : "border-[#ddd1fb] bg-white text-[#4f477f]"
                        }`}
                      >
                        {area.name}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[12px] text-[#7c8499]">Leave empty to allow all cities.</p>
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-[14px] border border-[#f7d7d7] bg-[#fff8f8] px-4 py-3 text-[13px] text-[#b42318]">
                {error}
              </div>
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-[14px] border border-[#ddd1fb] bg-white px-5 py-3 text-[13px] font-semibold text-[#6d5bd0]"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={saving || loading}
                className="rounded-[14px] bg-[#6d5bd0] px-5 py-3 text-[13px] font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : form.id ? "Update coupon" : "Create coupon"}
              </button>
            </div>
          </section>

          <section className="rounded-[24px] border border-[#ece5ff] bg-white p-6 shadow-[0_14px_34px_rgba(73,44,120,0.05)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-[22px] font-black tracking-[-0.03em] text-[#1f1f2c]">
                  Existing coupons
                </h2>
                <p className="mt-1 text-[13px] leading-[1.7] text-[#7b8198]">
                  Stackable coupons: {stackableCount}. Click any row to edit it.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {loading ? (
                <div className="rounded-[18px] border border-[#ece5ff] bg-[#fbf9ff] p-5 text-[13px] text-[#7b8198]">
                  Loading coupons…
                </div>
              ) : coupons.length === 0 ? (
                <div className="rounded-[18px] border border-dashed border-[#ddd1fb] bg-[#fbf9ff] p-5 text-[13px] text-[#7b8198]">
                  No coupons created yet.
                </div>
              ) : (
                coupons.map((coupon) => (
                  <button
                    key={coupon.id}
                    type="button"
                    onClick={() => beginEdit(coupon)}
                    className="w-full rounded-[18px] border border-[#ece5ff] bg-[#fcfbff] p-4 text-left transition hover:border-[#d4c8fb] hover:bg-white"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-[16px] font-black tracking-[-0.03em] text-[#2a2346]">
                          {coupon.code}
                        </div>
                        <div className="mt-1 text-[13px] font-semibold text-[#5d5388]">{coupon.title}</div>
                        {coupon.description ? (
                          <p className="mt-2 text-[13px] leading-[1.6] text-[#7b8198]">
                            {coupon.description}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-[0.08em]">
                        <span className={`rounded-full px-2.5 py-1 ${coupon.isActive ? "bg-[#e9fbf3] text-[#11804d]" : "bg-[#f8e5e5] text-[#b42318]"}`}>
                          {coupon.isActive ? "Active" : "Inactive"}
                        </span>
                        {coupon.stackable ? (
                          <span className="rounded-full bg-[#f4efff] px-2.5 py-1 text-[#6d5bd0]">Stackable</span>
                        ) : null}
                        {coupon.firstBookingOnly ? (
                          <span className="rounded-full bg-[#fff6e5] px-2.5 py-1 text-[#9a6700]">First booking</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-4">
                      <div className="rounded-[14px] border border-[#ece5ff] bg-white px-3 py-2">
                        <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Discount</div>
                        <div className="mt-1 text-[13px] font-semibold text-[#2a2346]">
                          {coupon.discountType === "flat"
                            ? `₹${coupon.discountValue}`
                            : coupon.discountType === "percent"
                              ? `${coupon.discountValue}%`
                              : `${coupon.discountValue}% / extra pet`}
                        </div>
                      </div>
                      <div className="rounded-[14px] border border-[#ece5ff] bg-white px-3 py-2">
                        <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Packages</div>
                        <div className="mt-1 text-[13px] font-semibold text-[#2a2346]">
                          {coupon.applicableServiceNames.length
                            ? coupon.applicableServiceNames.join(", ")
                            : "All"}
                        </div>
                      </div>
                      <div className="rounded-[14px] border border-[#ece5ff] bg-white px-3 py-2">
                        <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Cities</div>
                        <div className="mt-1 text-[13px] font-semibold text-[#2a2346]">
                          {coupon.applicableCities.length ? coupon.applicableCities.join(", ") : "All"}
                        </div>
                      </div>
                      <div className="rounded-[14px] border border-[#ece5ff] bg-white px-3 py-2">
                        <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Used</div>
                        <div className="mt-1 text-[13px] font-semibold text-[#2a2346]">{coupon.usageCount}</div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
