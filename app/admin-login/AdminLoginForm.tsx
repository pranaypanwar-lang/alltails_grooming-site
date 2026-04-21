"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Failed to log in");
      }

      router.replace("/admin/bookings");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to log in");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md rounded-[28px] border border-[#e8e3f5] bg-white p-8 shadow-[0_24px_80px_rgba(31,22,61,0.08)]">
      <h1 className="text-[30px] font-black tracking-[-0.03em] text-[#1f1f2c]">Admin login</h1>
      <p className="mt-2 text-[14px] text-[#6b7280]">Sign in to access the operations dashboard.</p>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8a90a6]">Username</span>
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="h-[48px] w-full rounded-[16px] border border-[#d9dbe7] bg-white px-4 text-[15px] text-[#1f1f2c] outline-none focus:border-[#6d5bd0]"
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
            className="h-[48px] w-full rounded-[16px] border border-[#d9dbe7] bg-white px-4 text-[15px] text-[#1f1f2c] outline-none focus:border-[#6d5bd0]"
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
        className="mt-6 inline-flex h-[50px] w-full items-center justify-center rounded-[16px] bg-[#6d5bd0] text-[15px] font-semibold text-white transition hover:bg-[#5f4fc2] disabled:opacity-60"
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
