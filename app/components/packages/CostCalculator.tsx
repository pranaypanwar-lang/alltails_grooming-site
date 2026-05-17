"use client";

import { useState } from "react";
import Link from "next/link";

const PACKAGES = [
  {
    name: "Essential Care",
    slug: "essential-care",
    basePrice: 999,
    description: "Bath, blow dry, brushing, nail trim, ear cleaning",
  },
  {
    name: "Signature Care",
    slug: "signature-care",
    basePrice: 1299,
    description: "Essential Care + hygiene trim, dental hygiene",
  },
  {
    name: "Complete Pampering",
    slug: "complete-pampering",
    basePrice: 1799,
    description: "Signature Care + full body haircut, paw butter, serum, perfume",
  },
];

const PET_MULTIPLIER: Record<string, number> = {
  "1": 1,
  "2": 1.8,
  "3": 2.5,
};

export function CostCalculator() {
  const [petType, setPetType] = useState<"dog" | "cat">("dog");
  const [petCount, setPetCount] = useState("1");
  const [selectedPkg, setSelectedPkg] = useState("signature-care");

  const pkg = PACKAGES.find((p) => p.slug === selectedPkg) ?? PACKAGES[1];
  const multiplier = PET_MULTIPLIER[petCount] ?? 1;
  const estimatedCost = Math.round(pkg.basePrice * multiplier);

  return (
    <section className="mt-20 rounded-[32px] border border-[#ece5fb] bg-white px-6 py-8 shadow-[0_18px_50px_rgba(34,22,74,0.06)] sm:px-10 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="inline-flex rounded-full border border-[#e8ddff] bg-[#faf7ff] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a5ce0]">
            Cost estimator
          </span>
          <h2 className="mt-2 text-[24px] font-black tracking-[-0.03em] text-[#2a2346] lg:text-[28px]">
            How much will grooming cost for my pet?
          </h2>
          <p className="mt-1 text-[14px] text-[#6b7280]">
            Select your pet type, number of pets, and preferred package for an instant estimate.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        {/* Pet type */}
        <fieldset>
          <legend className="mb-3 text-[12px] font-black uppercase tracking-[0.14em] text-[#8a82a3]">
            Pet type
          </legend>
          <div className="flex gap-2">
            {(["dog", "cat"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setPetType(type)}
                className={`flex-1 rounded-[14px] border px-4 py-3 text-[14px] font-semibold capitalize transition ${
                  petType === type
                    ? "border-[#6d5bd0] bg-[#6d5bd0] text-white shadow-[0_8px_20px_rgba(109,91,208,0.3)]"
                    : "border-[#e5dff5] bg-white text-[#3a3458] hover:border-[#c4b8f0]"
                }`}
              >
                {type === "dog" ? "🐕 Dog" : "🐈 Cat"}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Number of pets */}
        <fieldset>
          <legend className="mb-3 text-[12px] font-black uppercase tracking-[0.14em] text-[#8a82a3]">
            Number of pets
          </legend>
          <div className="flex gap-2">
            {["1", "2", "3"].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPetCount(n)}
                className={`flex-1 rounded-[14px] border px-4 py-3 text-[15px] font-bold transition ${
                  petCount === n
                    ? "border-[#6d5bd0] bg-[#6d5bd0] text-white shadow-[0_8px_20px_rgba(109,91,208,0.3)]"
                    : "border-[#e5dff5] bg-white text-[#3a3458] hover:border-[#c4b8f0]"
                }`}
              >
                {n}{n === "3" ? "+" : ""}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Package */}
        <fieldset>
          <legend className="mb-3 text-[12px] font-black uppercase tracking-[0.14em] text-[#8a82a3]">
            Package
          </legend>
          <div className="flex flex-col gap-2">
            {PACKAGES.map((p) => (
              <button
                key={p.slug}
                type="button"
                onClick={() => setSelectedPkg(p.slug)}
                className={`rounded-[12px] border px-3 py-2.5 text-left text-[13px] font-semibold transition ${
                  selectedPkg === p.slug
                    ? "border-[#6d5bd0] bg-[#f4efff] text-[#4a3aaa]"
                    : "border-[#e5dff5] bg-white text-[#3a3458] hover:border-[#c4b8f0]"
                }`}
              >
                {p.name} — ₹{p.basePrice.toLocaleString("en-IN")}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      {/* Result */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-5 rounded-[20px] bg-[linear-gradient(135deg,#f4efff_0%,#ede5ff_100%)] px-6 py-5">
        <div>
          <div className="text-[12px] font-black uppercase tracking-[0.14em] text-[#8a82a3]">
            Estimated cost
          </div>
          <div className="mt-1 text-[36px] font-black tracking-[-0.04em] text-[#2a2346]">
            ₹{estimatedCost.toLocaleString("en-IN")}
          </div>
          <p className="mt-1 text-[12.5px] text-[#6b7280]">
            {pkg.name} · {petCount === "3" ? "3+" : petCount} {petType}{Number(petCount) > 1 || petCount === "3" ? "s" : ""}
            {petType === "cat" ? " (same packages apply)" : ""}
          </p>
          <p className="mt-0.5 text-[11.5px] text-[#9a93b3]">
            Final price confirmed at booking. Multi-pet discounts may apply.
          </p>
        </div>
        <Link
          href={`/booking?package=${selectedPkg}`}
          className="inline-flex h-[50px] items-center justify-center rounded-full bg-[#6d5bd0] px-7 text-[14px] font-bold text-white shadow-[0_12px_28px_rgba(109,91,208,0.32)] transition hover:bg-[#5f4fc2] active:scale-[0.98]"
        >
          Book at this price →
        </Link>
      </div>
    </section>
  );
}
