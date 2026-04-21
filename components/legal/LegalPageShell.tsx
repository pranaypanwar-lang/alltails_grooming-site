import Link from "next/link";

type LegalSectionItem = {
  title: string;
  content: React.ReactNode;
};

type LegalPageShellProps = {
  title: string;
  eyebrow?: string;
  summary: string;
  effectiveDate: string;
  sections: LegalSectionItem[];
};

const LEGAL_LINKS = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-and-conditions", label: "Terms & Conditions" },
  { href: "/cancellation-policy", label: "Cancellation Policy" },
  { href: "/refund-policy", label: "Refund Policy" },
];

function LegalSection({ title, content }: LegalSectionItem) {
  return (
    <section className="space-y-3 rounded-[28px] border border-[#ece6fb] bg-white p-6 shadow-[0_20px_60px_rgba(84,56,151,0.08)]">
      <h2 className="text-[20px] font-bold tracking-[-0.02em] text-[#231942]">{title}</h2>
      <div className="space-y-3 text-[15px] leading-[1.8] text-[#5e5676]">{content}</div>
    </section>
  );
}

export function LegalPageShell({
  title,
  eyebrow = "Legal",
  summary,
  effectiveDate,
  sections,
}: LegalPageShellProps) {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#faf7ff_0%,#ffffff_42%,#f7f3ff_100%)] px-5 py-10 text-[#231942] md:px-8 lg:px-12">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex rounded-full border border-[#ddd1fb] bg-white px-4 py-2 text-[13px] font-semibold text-[#6d5bd0] transition hover:bg-[#f8f5ff]"
            >
              Back to website
            </Link>
            <Link
              href="/#contact-section"
              className="inline-flex rounded-full border border-[#efe8ff] bg-[#f8f5ff] px-4 py-2 text-[13px] font-semibold text-[#5d50ab] transition hover:bg-[#f2eeff]"
            >
              Contact support
            </Link>
          </div>

          <div className="space-y-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#8d84a7]">
              {eyebrow}
            </p>
            <h1 className="text-[34px] font-black tracking-[-0.04em] text-[#231942] md:text-[44px]">
              {title}
            </h1>
            <p className="max-w-2xl text-[16px] leading-[1.9] text-[#6b6483]">{summary}</p>
            <p className="text-[13px] text-[#8d84a7]">Effective date: {effectiveDate}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {LEGAL_LINKS.map((item) => {
              const active = item.label === title;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-3.5 py-2 text-[12px] font-semibold transition ${
                    active
                      ? "bg-[#6d5bd0] text-white shadow-[0_10px_24px_rgba(109,91,208,0.18)]"
                      : "border border-[#e8e1fb] bg-white text-[#6d5bd0] hover:bg-[#faf7ff]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        {sections.map((section) => (
          <LegalSection key={section.title} title={section.title} content={section.content} />
        ))}

        <section className="rounded-[28px] border border-[#ece6fb] bg-[#f9f6ff] p-6 shadow-[0_20px_60px_rgba(84,56,151,0.06)]">
          <h2 className="text-[20px] font-bold tracking-[-0.02em] text-[#231942]">
            Need help?
          </h2>
          <div className="mt-3 space-y-3 text-[15px] leading-[1.8] text-[#5e5676]">
            <p>
              If you need help with a booking, payment, cancellation, refund, or privacy-related
              request, please contact{" "}
              <a className="font-semibold text-[#6d5bd0]" href="mailto:hello@alltails.in">
                hello@alltails.in
              </a>{" "}
              or WhatsApp{" "}
              <a className="font-semibold text-[#6d5bd0]" href="https://wa.me/919560098105">
                +91 95600 98105
              </a>
              .
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
