"use client";

import Image from "next/image";

type FaqSectionProps = {
  onTalkToUs: (message: string) => void;
};

const TALK_TO_EXPERT_MESSAGE =
  "Hi All Tails, I'd like to talk to a grooming expert and get help choosing the right package for my pet.";

export default function FaqSection({ onTalkToUs }: FaqSectionProps) {
  return (
    <section id="faqs-section" className="relative overflow-hidden bg-[#fcfaff] pt-10 pb-12 sm:py-20 lg:py-[120px]">
      {/* BACKGROUND GLOWS */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-120px] top-[140px] h-[300px] w-[300px] rounded-full bg-[#efe7ff] blur-[100px]" />
        <div className="absolute right-[-100px] bottom-[100px] h-[260px] w-[260px] rounded-full bg-[#fff3ea] blur-[95px]" />
        <div className="absolute left-[42%] bottom-[80px] h-[220px] w-[220px] rounded-full bg-[#f3ecff] blur-[90px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1240px] px-4 sm:px-6">

        {/* MOBILE FAQ */}
        <div className="lg:hidden">
          <div className="text-center">
            <div className="inline-flex rounded-full border border-[#e8ddff] bg-white px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7a5ce0] shadow-[0_6px_16px_rgba(122,92,224,0.07)]">
              FAQs
            </div>
            <h2 className="mt-3 text-[24px] font-black leading-[1.06] tracking-[-0.035em] text-[#2a2346]">
              Got questions?<br />We&apos;ve got answers.
            </h2>
            <p className="mx-auto mt-2 max-w-[280px] text-[13px] leading-[1.65] text-[#6b7280]">
              Everything you may want to know before booking — clearly answered.
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 rounded-[16px] border border-[#ece5ff] bg-white px-4 py-3 shadow-[0_4px_14px_rgba(109,91,208,0.06)]">
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-[#2a2346]">First time booking?</div>
              <p className="mt-0.5 text-[11.5px] leading-[1.5] text-[#6b7280]">We&apos;ll help you choose the right package for your pet.</p>
            </div>
            <button
              type="button"
              onClick={() => onTalkToUs(TALK_TO_EXPERT_MESSAGE)}
              className="shrink-0 rounded-full bg-[#f4efff] px-3.5 py-2 text-[12px] font-semibold text-[#6d5bd0] transition active:scale-95"
            >
              Talk to us →
            </button>
          </div>

          <div className="mt-4 space-y-2">
            <details open className="group rounded-[18px] border border-[#ebe5ff] bg-white p-3 shadow-[0_4px_14px_rgba(73,44,120,0.05)]">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="inline-flex rounded-full bg-[#f4efff] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6d5bd0]">Comfort</div>
                  <div className="mt-1 text-[14px] font-bold leading-[1.3] tracking-[-0.01em] text-[#2a2346]">Will my pet be anxious during grooming?</div>
                </div>
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f7f3ff] text-[#6d5bd0] transition-all duration-300 group-open:rotate-180">
                  <span className="text-[13px] leading-none">⌄</span>
                </div>
              </summary>
              <div className="mt-3 h-px w-full bg-[linear-gradient(to_right,transparent,#e9e1ff,transparent)]" />
              <p className="mt-3 text-[13px] leading-[1.75] text-[#6b7280]">
                We begin every session with a calm bonding period. We move at your pet&apos;s pace — no force, no rushing — so they feel safe throughout.
              </p>
            </details>

            <details className="group rounded-[18px] border border-[#ebe5ff] bg-white p-3 shadow-[0_4px_14px_rgba(73,44,120,0.05)]">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="inline-flex rounded-full bg-[#f4efff] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6d5bd0]">Setup</div>
                  <div className="mt-1 text-[14px] font-bold leading-[1.3] tracking-[-0.01em] text-[#2a2346]">Do I need to prepare anything at home?</div>
                </div>
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f7f3ff] text-[#6d5bd0] transition-all duration-300 group-open:rotate-180">
                  <span className="text-[13px] leading-none">⌄</span>
                </div>
              </summary>
              <div className="mt-3 h-px w-full bg-[linear-gradient(to_right,transparent,#e9e1ff,transparent)]" />
              <p className="mt-3 text-[13px] leading-[1.75] text-[#6b7280]">
                No preparation needed. Our team brings all equipment and products. We only need a small space with access to water and power.
              </p>
            </details>

            <details className="group rounded-[18px] border border-[#f4dfcf] bg-white p-3 shadow-[0_4px_14px_rgba(234,88,12,0.04)]">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="inline-flex rounded-full bg-[#fff5ee] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ea580c]">Timing</div>
                  <div className="mt-1 text-[14px] font-bold leading-[1.3] tracking-[-0.01em] text-[#2a2346]">How long does a grooming session take?</div>
                </div>
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#fff5ee] text-[#ea580c] transition-all duration-300 group-open:rotate-180">
                  <span className="text-[13px] leading-none">⌄</span>
                </div>
              </summary>
              <div className="mt-3 h-px w-full bg-[linear-gradient(to_right,transparent,#f4dfcf,transparent)]" />
              <p className="mt-3 text-[13px] leading-[1.75] text-[#6b7280]">
                Basic sessions ~60 min, Hygiene ~90 min, Luxury ~120 min. We never rush — patience is central to calm, quality grooming.
              </p>
            </details>

            <details className="group rounded-[18px] border border-[#ebe5ff] bg-white p-3 shadow-[0_4px_14px_rgba(73,44,120,0.05)]">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="inline-flex rounded-full bg-[#f4efff] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6d5bd0]">Inclusions</div>
                  <div className="mt-1 text-[14px] font-bold leading-[1.3] tracking-[-0.01em] text-[#2a2346]">What exactly is included in a session?</div>
                </div>
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f7f3ff] text-[#6d5bd0] transition-all duration-300 group-open:rotate-180">
                  <span className="text-[13px] leading-none">⌄</span>
                </div>
              </summary>
              <div className="mt-3 h-px w-full bg-[linear-gradient(to_right,transparent,#e9e1ff,transparent)]" />
              <p className="mt-3 text-[13px] leading-[1.75] text-[#6b7280]">
                Sessions include bath, conditioning, blow dry, haircut, paw care, ear cleaning, dental cleaning, serum, brushing, and finishing. All done gently, step by step.
              </p>
            </details>

            <details className="group rounded-[18px] border border-[#dff3ec] bg-white p-3 shadow-[0_4px_14px_rgba(17,155,115,0.04)]">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="inline-flex rounded-full bg-[#f5fdf9] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#119b73]">Safety</div>
                  <div className="mt-1 text-[14px] font-bold leading-[1.3] tracking-[-0.01em] text-[#2a2346]">Are your products safe for pets?</div>
                </div>
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f5fdf9] text-[#119b73] transition-all duration-300 group-open:rotate-180">
                  <span className="text-[13px] leading-none">⌄</span>
                </div>
              </summary>
              <div className="mt-3 h-px w-full bg-[linear-gradient(to_right,transparent,#dff3ec,transparent)]" />
              <p className="mt-3 text-[13px] leading-[1.75] text-[#6b7280]">
                Yes. We use vet-approved, breed-specific, skin-safe products tailored to your pet&apos;s coat and condition.
              </p>
            </details>

            <details className="group rounded-[18px] border border-[#ebe5ff] bg-white p-3 shadow-[0_4px_14px_rgba(73,44,120,0.05)]">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="inline-flex rounded-full bg-[#f4efff] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6d5bd0]">Handling</div>
                  <div className="mt-1 text-[14px] font-bold leading-[1.3] tracking-[-0.01em] text-[#2a2346]">What if my pet is very scared or difficult to handle?</div>
                </div>
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f7f3ff] text-[#6d5bd0] transition-all duration-300 group-open:rotate-180">
                  <span className="text-[13px] leading-none">⌄</span>
                </div>
              </summary>
              <div className="mt-3 h-px w-full bg-[linear-gradient(to_right,transparent,#e9e1ff,transparent)]" />
              <p className="mt-3 text-[13px] leading-[1.75] text-[#6b7280]">
                Our groomers are trained to handle anxious pets with patience. If needed, we adapt or slow down. Your pet&apos;s comfort always comes before speed.
              </p>
            </details>

            <details className="group rounded-[18px] border border-[#ebe5ff] bg-white p-3 shadow-[0_4px_14px_rgba(73,44,120,0.05)]">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="inline-flex rounded-full bg-[#f4efff] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6d5bd0]">Quality</div>
                  <div className="mt-1 text-[14px] font-bold leading-[1.3] tracking-[-0.01em] text-[#2a2346]">How do you ensure quality during the session?</div>
                </div>
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f7f3ff] text-[#6d5bd0] transition-all duration-300 group-open:rotate-180">
                  <span className="text-[13px] leading-none">⌄</span>
                </div>
              </summary>
              <div className="mt-3 h-px w-full bg-[linear-gradient(to_right,transparent,#e9e1ff,transparent)]" />
              <p className="mt-3 text-[13px] leading-[1.75] text-[#6b7280]">
                Every session is monitored by our QA team of senior groomers via photos and videos reviewed in real time.
              </p>
            </details>

            <details className="group rounded-[18px] border border-[#ebe5ff] bg-white p-3 shadow-[0_4px_14px_rgba(73,44,120,0.05)]">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="inline-flex rounded-full bg-[#f4efff] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6d5bd0]">Scheduling</div>
                  <div className="mt-1 text-[14px] font-bold leading-[1.3] tracking-[-0.01em] text-[#2a2346]">How often should I book grooming?</div>
                </div>
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f7f3ff] text-[#6d5bd0] transition-all duration-300 group-open:rotate-180">
                  <span className="text-[13px] leading-none">⌄</span>
                </div>
              </summary>
              <div className="mt-3 h-px w-full bg-[linear-gradient(to_right,transparent,#e9e1ff,transparent)]" />
              <p className="mt-3 text-[13px] leading-[1.75] text-[#6b7280]">
                Most pets benefit from grooming every 3–5 weeks depending on breed and coat length. Our team can recommend the best schedule.
              </p>
            </details>
          </div>

          <div className="mt-5 flex items-center gap-3 rounded-[18px] border border-[#e6ddff] bg-white px-4 py-3.5 shadow-[0_4px_16px_rgba(80,60,160,0.06)]">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f4efff] text-lg">💬</span>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-[#2a2346]">Still unsure? Talk to our team</div>
              <p className="mt-0.5 text-[11.5px] text-[#8a90a2]">Get guidance based on your pet&apos;s coat and needs.</p>
            </div>
            <button
              type="button"
              onClick={() => onTalkToUs(TALK_TO_EXPERT_MESSAGE)}
              className="shrink-0 text-[13px] font-semibold text-[#6d5bd0] transition active:opacity-70"
            >
              →
            </button>
          </div>
        </div>

        {/* DESKTOP FAQ */}
        <div className="hidden lg:grid items-start gap-14 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="relative rounded-[34px] border border-[#ebe5ff] bg-white/80 p-5 shadow-[0_24px_70px_rgba(73,44,120,0.06)] backdrop-blur-sm sm:p-8 md:p-10 lg:min-h-[860px]">
            <div className="inline-flex rounded-full border border-[#e8ddff] bg-white px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#7a5ce0] shadow-[0_8px_20px_rgba(122,92,224,0.06)]">
              FAQs
            </div>

            <h2 className="mt-4 text-[26px] font-black leading-[1.06] tracking-[-0.035em] text-[#2a2346] sm:mt-6 sm:text-[40px] md:text-[54px]">
              Got questions?
              <br />
              We&apos;ve got answers.
            </h2>

            <p className="mt-3 max-w-[520px] text-[14px] leading-[1.75] text-[#6b7280] sm:mt-5 sm:text-[18px]">
              Everything you may want to know before booking, answered with clarity.
            </p>

            <div className="mt-4 hidden flex-wrap gap-3 sm:flex">
              <span className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-4 py-2 text-[13px] font-medium text-[#4b4370] shadow-sm">
                Comfort-first grooming
              </span>
              <span className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-4 py-2 text-[13px] font-medium text-[#4b4370] shadow-sm">
                Transparent process
              </span>
            </div>

            <div className="mt-8 rounded-[24px] bg-[linear-gradient(135deg,#faf7ff_0%,#fff9f4_100%)] p-5 ring-1 ring-[#f0e9ff]">
              <div className="text-[15px] font-semibold text-[#2a2346]">
                Best if you&apos;re booking for the first time
              </div>
              <p className="mt-2 text-[14px] leading-[1.8] text-[#6b7280]">
                Tell us a little about your pet and we&apos;ll help you choose the right
                package with complete confidence.
              </p>
            </div>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => onTalkToUs(TALK_TO_EXPERT_MESSAGE)}
                className="group inline-flex items-center gap-3 rounded-full border border-[#e6ddff] bg-white px-6 py-3 text-[15px] font-semibold text-[#3d3472] shadow-[0_10px_24px_rgba(80,60,160,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#d6caff] hover:shadow-[0_16px_32px_rgba(80,60,160,0.12)]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f4efff] text-[#6d5bd0] transition-all duration-300 group-hover:scale-105">
                  💬
                </span>

                Talk to our team

                <span className="transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </button>

              <p className="mt-3 text-[13px] text-[#8a90a2]">
                Get personalized guidance based on your pet
              </p>
            </div>

            <div className="pointer-events-none relative mt-10 hidden sm:block">
              <div className="absolute left-[36px] top-[60px] h-[180px] w-[180px] rounded-full bg-[#ffe7a6]/30 blur-[45px]" />
              <Image
                src="/images/faq-dog.png"
                alt="Friendly dog illustration"
                width={420}
                height={420}
                loading="lazy"
                className="relative w-[260px] md:w-[320px] lg:w-[360px] rotate-[-4deg] object-contain drop-shadow-[0_20px_40px_rgba(42,35,70,0.10)]"
              />
            </div>
          </div>

          <div className="space-y-5">
            <details className="group rounded-[24px] border border-[#ebe5ff] bg-white/95 p-4 shadow-[0_20px_60px_rgba(73,44,120,0.06)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_26px_75px_rgba(73,44,120,0.09)] open:shadow-[0_30px_80px_rgba(73,44,120,0.10)] sm:rounded-[28px] sm:p-6 md:p-7">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-5">
                <div>
                  <div className="inline-flex rounded-full bg-[#f4efff] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6d5bd0]">
                    Comfort
                  </div>
                  <div className="mt-2 text-[15px] font-bold leading-[1.35] tracking-[-0.01em] text-[#2a2346] sm:mt-4 sm:text-[24px] sm:font-black sm:leading-[1.25] sm:tracking-[-0.02em]">
                    Will my pet be anxious during grooming?
                  </div>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f7f3ff] text-[#6d5bd0] transition-all duration-300 group-open:rotate-180 sm:mt-1 sm:h-10 sm:w-10">
                  <span className="text-[16px] leading-none sm:text-[18px]">⌄</span>
                </div>
              </summary>
              <div className="mt-5 h-px w-full bg-[linear-gradient(to_right,transparent,#e9e1ff,transparent)]" />
              <p className="mt-5 text-[16px] leading-[1.95] text-[#6b7280]">
                We begin every session with a calm bonding period where the groomer
                gently familiarizes themselves with your pet. We move at your pet&apos;s
                pace—no force, no rushing—so they feel safe and comfortable throughout.
              </p>
            </details>

            <details className="group rounded-[24px] border border-[#ebe5ff] bg-white/95 p-4 shadow-[0_20px_60px_rgba(73,44,120,0.06)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_26px_75px_rgba(73,44,120,0.09)] open:shadow-[0_30px_80px_rgba(73,44,120,0.10)] sm:rounded-[28px] sm:p-6 md:p-7">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-5">
                <div>
                  <div className="inline-flex rounded-full bg-[#f4efff] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6d5bd0]">
                    Setup
                  </div>
                  <div className="mt-2 text-[15px] font-bold leading-[1.35] tracking-[-0.01em] text-[#2a2346] sm:mt-4 sm:text-[24px] sm:font-black sm:leading-[1.25] sm:tracking-[-0.02em]">
                    Do I need to prepare anything at home?
                  </div>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f7f3ff] text-[#6d5bd0] transition-all duration-300 group-open:rotate-180 sm:mt-1 sm:h-10 sm:w-10">
                  <span className="text-[16px] leading-none sm:text-[18px]">⌄</span>
                </div>
              </summary>
              <div className="mt-5 h-px w-full bg-[linear-gradient(to_right,transparent,#e9e1ff,transparent)]" />
              <p className="mt-5 text-[16px] leading-[1.95] text-[#6b7280]">
                No preparation is needed. Our team brings all equipment, products,
                and setup required for the session. We only need a small space with
                access to water and power.
              </p>
            </details>

            <details className="group rounded-[24px] border border-[#f4dfcf] bg-white/95 p-4 shadow-[0_20px_60px_rgba(234,88,12,0.05)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_26px_75px_rgba(234,88,12,0.08)] open:shadow-[0_30px_80px_rgba(234,88,12,0.09)] sm:rounded-[28px] sm:p-6 md:p-7">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-5">
                <div>
                  <div className="inline-flex rounded-full bg-[#fff5ee] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ea580c]">
                    Timing
                  </div>
                  <div className="mt-2 text-[15px] font-bold leading-[1.35] tracking-[-0.01em] text-[#2a2346] sm:mt-4 sm:text-[24px] sm:font-black sm:leading-[1.25] sm:tracking-[-0.02em]">
                    How long does a grooming session take?
                  </div>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fff5ee] text-[#ea580c] transition-all duration-300 group-open:rotate-180 sm:mt-1 sm:h-10 sm:w-10">
                  <span className="text-[16px] leading-none sm:text-[18px]">⌄</span>
                </div>
              </summary>
              <div className="mt-5 h-px w-full bg-[linear-gradient(to_right,transparent,#f4dfcf,transparent)]" />
              <p className="mt-5 text-[16px] leading-[1.95] text-[#6b7280]">
                It depends on the package selected. Basic sessions usually take around
                <span className="font-semibold text-[#2a2346]"> 60 minutes</span>,
                Hygiene sessions around
                <span className="font-semibold text-[#2a2346]"> 90 minutes</span>, and
                Luxury sessions around
                <span className="font-semibold text-[#2a2346]"> 120 minutes</span>.
                We never rush—patience is the key to anxiety-free grooming and finesse.
              </p>
            </details>

            <details className="group rounded-[24px] border border-[#ebe5ff] bg-white/95 p-4 shadow-[0_20px_60px_rgba(73,44,120,0.06)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_26px_75px_rgba(73,44,120,0.09)] open:shadow-[0_30px_80px_rgba(73,44,120,0.10)] sm:rounded-[28px] sm:p-6 md:p-7">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-5">
                <div>
                  <div className="inline-flex rounded-full bg-[#f4efff] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6d5bd0]">
                    Inclusions
                  </div>
                  <div className="mt-2 text-[15px] font-bold leading-[1.35] tracking-[-0.01em] text-[#2a2346] sm:mt-4 sm:text-[24px] sm:font-black sm:leading-[1.25] sm:tracking-[-0.02em]">
                    What exactly is included in a session?
                  </div>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f7f3ff] text-[#6d5bd0] transition-all duration-300 group-open:rotate-180 sm:mt-1 sm:h-10 sm:w-10">
                  <span className="text-[16px] leading-none sm:text-[18px]">⌄</span>
                </div>
              </summary>
              <div className="mt-5 h-px w-full bg-[linear-gradient(to_right,transparent,#e9e1ff,transparent)]" />
              <p className="mt-5 text-[16px] leading-[1.95] text-[#6b7280]">
                Depending on the package, sessions may include bath, conditioning,
                blow dry, haircut or styling, paw care, ear cleaning, dental cleaning,
                serum, brushing, and finishing touches. Everything is done gently,
                step by step, and with your pet&apos;s comfort in mind.
              </p>
            </details>

            <details className="group rounded-[24px] border border-[#dff3ec] bg-white/95 p-4 shadow-[0_20px_60px_rgba(17,155,115,0.05)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_26px_75px_rgba(17,155,115,0.08)] open:shadow-[0_30px_80px_rgba(17,155,115,0.09)] sm:rounded-[28px] sm:p-6 md:p-7">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-5">
                <div>
                  <div className="inline-flex rounded-full bg-[#f5fdf9] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#119b73]">
                    Safety
                  </div>
                  <div className="mt-2 text-[15px] font-bold leading-[1.35] tracking-[-0.01em] text-[#2a2346] sm:mt-4 sm:text-[24px] sm:font-black sm:leading-[1.25] sm:tracking-[-0.02em]">
                    Are your products safe for pets?
                  </div>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f5fdf9] text-[#119b73] transition-all duration-300 group-open:rotate-180 sm:mt-1 sm:h-10 sm:w-10">
                  <span className="text-[16px] leading-none sm:text-[18px]">⌄</span>
                </div>
              </summary>
              <div className="mt-5 h-px w-full bg-[linear-gradient(to_right,transparent,#dff3ec,transparent)]" />
              <p className="mt-5 text-[16px] leading-[1.95] text-[#6b7280]">
                Absolutely. We use vet-approved, breed-specific, and skin-safe
                products tailored to your pet&apos;s coat and condition.
              </p>
            </details>

            <details className="group rounded-[24px] border border-[#ebe5ff] bg-white/95 p-4 shadow-[0_20px_60px_rgba(73,44,120,0.06)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_26px_75px_rgba(73,44,120,0.09)] open:shadow-[0_30px_80px_rgba(73,44,120,0.10)] sm:rounded-[28px] sm:p-6 md:p-7">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-5">
                <div>
                  <div className="inline-flex rounded-full bg-[#f4efff] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6d5bd0]">
                    Handling
                  </div>
                  <div className="mt-2 text-[15px] font-bold leading-[1.35] tracking-[-0.01em] text-[#2a2346] sm:mt-4 sm:text-[24px] sm:font-black sm:leading-[1.25] sm:tracking-[-0.02em]">
                    What if my pet is very scared or difficult to handle?
                  </div>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f7f3ff] text-[#6d5bd0] transition-all duration-300 group-open:rotate-180 sm:mt-1 sm:h-10 sm:w-10">
                  <span className="text-[16px] leading-none sm:text-[18px]">⌄</span>
                </div>
              </summary>
              <div className="mt-5 h-px w-full bg-[linear-gradient(to_right,transparent,#e9e1ff,transparent)]" />
              <p className="mt-5 text-[16px] leading-[1.95] text-[#6b7280]">
                Our groomers are trained to handle anxious pets with patience and
                care. If needed, we adapt the session or slow down further. Your pet&apos;s
                comfort always comes before speed.
              </p>
            </details>

            <details className="group rounded-[24px] border border-[#ebe5ff] bg-white/95 p-4 shadow-[0_20px_60px_rgba(73,44,120,0.06)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_26px_75px_rgba(73,44,120,0.09)] open:shadow-[0_30px_80px_rgba(73,44,120,0.10)] sm:rounded-[28px] sm:p-6 md:p-7">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-5">
                <div>
                  <div className="inline-flex rounded-full bg-[#f4efff] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6d5bd0]">
                    Quality
                  </div>
                  <div className="mt-2 text-[15px] font-bold leading-[1.35] tracking-[-0.01em] text-[#2a2346] sm:mt-4 sm:text-[24px] sm:font-black sm:leading-[1.25] sm:tracking-[-0.02em]">
                    How do you ensure quality during the session?
                  </div>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f7f3ff] text-[#6d5bd0] transition-all duration-300 group-open:rotate-180 sm:mt-1 sm:h-10 sm:w-10">
                  <span className="text-[16px] leading-none sm:text-[18px]">⌄</span>
                </div>
              </summary>
              <div className="mt-5 h-px w-full bg-[linear-gradient(to_right,transparent,#e9e1ff,transparent)]" />
              <p className="mt-5 text-[16px] leading-[1.95] text-[#6b7280]">
                Every session is monitored by our QA team of senior groomers. Photos
                and videos are reviewed in real time so we can maintain consistent,
                premium-quality grooming standards.
              </p>
            </details>

            <details className="group rounded-[24px] border border-[#ebe5ff] bg-white/95 p-4 shadow-[0_20px_60px_rgba(73,44,120,0.06)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_26px_75px_rgba(73,44,120,0.09)] open:shadow-[0_30px_80px_rgba(73,44,120,0.10)] sm:rounded-[28px] sm:p-6 md:p-7">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-5">
                <div>
                  <div className="inline-flex rounded-full bg-[#f4efff] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6d5bd0]">
                    Scheduling
                  </div>
                  <div className="mt-2 text-[15px] font-bold leading-[1.35] tracking-[-0.01em] text-[#2a2346] sm:mt-4 sm:text-[24px] sm:font-black sm:leading-[1.25] sm:tracking-[-0.02em]">
                    How often should I book grooming?
                  </div>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f7f3ff] text-[#6d5bd0] transition-all duration-300 group-open:rotate-180 sm:mt-1 sm:h-10 sm:w-10">
                  <span className="text-[16px] leading-none sm:text-[18px]">⌄</span>
                </div>
              </summary>
              <div className="mt-5 h-px w-full bg-[linear-gradient(to_right,transparent,#e9e1ff,transparent)]" />
              <p className="mt-5 text-[16px] leading-[1.95] text-[#6b7280]">
                Most pets benefit from grooming every 3–5 weeks, depending on breed,
                coat length, and lifestyle. If you&apos;re unsure, our team can recommend
                the best schedule for your pet.
              </p>
            </details>
          </div>
        </div>
      </div>
    </section>
  );
}
