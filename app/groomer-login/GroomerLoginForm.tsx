"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function GroomerLoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/groomer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Login failed");
      router.replace("/groomer");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md rounded-[32px] border border-[#e5dcff] bg-white/95 p-8 shadow-[0_32px_90px_rgba(73,44,120,0.12)] backdrop-blur">
      <div className="inline-flex rounded-full bg-[#f2edff] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#6d5bd0]">
        All Tails Groomer League
      </div>
      <h1 className="mt-4 text-[32px] font-black tracking-[-0.03em] text-[#1f1f2c]">Groomer login</h1>
      <p className="mt-2 text-[14px] leading-[1.7] text-[#6b7280]">
        Apna phone number aur password daal kar dashboard kholiye.
      </p>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8a90a6]">Phone</span>
          <input
            type="text"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="h-[50px] w-full rounded-[16px] border border-[#d9dbe7] bg-white px-4 text-[15px] text-[#1f1f2c] outline-none focus:border-[#6d5bd0]"
            autoComplete="username"
            required
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8a90a6]">Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-[50px] w-full rounded-[16px] border border-[#d9dbe7] bg-white px-4 text-[15px] text-[#1f1f2c] outline-none focus:border-[#6d5bd0]"
            autoComplete="current-password"
            required
          />
        </label>
      </div>

      {error ? (
        <div className="mt-4 rounded-[16px] border border-[#ffd7d7] bg-[#fff8f8] px-4 py-3 text-[13px] text-[#b42318]">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 inline-flex h-[52px] w-full items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#6d5bd0_0%,#8b7be7_100%)] text-[15px] font-semibold text-white disabled:opacity-60"
      >
        {isSubmitting ? "Login ho raha hai..." : "Dashboard kholo"}
      </button>
    </form>
  );
}
