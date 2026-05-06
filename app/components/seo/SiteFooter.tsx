import Link from "next/link";

import {
  BUSINESS_INFO,
  emailMailto,
  phoneTel,
  whatsappHref,
} from "@/lib/seo/businessInfo";

const SERVICE_LINKS = [
  { href: "/", label: "At-home pet grooming" },
  { href: "/packages", label: "Pet grooming packages" },
  { href: "/booking", label: "Book pet grooming" },
  { href: "/faq", label: "Pet grooming FAQs" },
  { href: "/contact", label: "Contact All Tails" },
  { href: "/blogs", label: "Pet grooming guides" },
];

const POLICY_LINKS = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-and-conditions", label: "Terms & Conditions" },
  { href: "/refund-policy", label: "Refund Policy" },
  { href: "/cancellation-policy", label: "Cancellation Policy" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-[#ece5fb] bg-[#1f1b35] text-[#d8d2ec]">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-6 py-14 lg:grid-cols-4 lg:px-8">
        <div>
          <h2 className="text-[18px] font-black tracking-[-0.02em] text-white">
            All Tails
          </h2>
          <p className="mt-3 text-[13px] leading-[1.7] text-[#aea7c9]">
            {BUSINESS_INFO.shortServiceModel}
          </p>
        </div>

        <div>
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#bcb3de]">
            Explore
          </h3>
          <ul className="mt-4 space-y-2 text-[14px]">
            {SERVICE_LINKS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#bcb3de]">
            Contact
          </h3>
          <ul className="mt-4 space-y-2 text-[14px]">
            <li>
              <a href={phoneTel} className="hover:text-white">
                {BUSINESS_INFO.phoneDisplay}
              </a>
            </li>
            <li>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white"
              >
                WhatsApp us
              </a>
            </li>
            <li>
              <a href={emailMailto} className="hover:text-white">
                {BUSINESS_INFO.email}
              </a>
            </li>
            <li className="text-[#aea7c9]">{BUSINESS_INFO.hours}</li>
          </ul>
        </div>

        <div>
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#bcb3de]">
            Service Areas
          </h3>
          <p className="mt-4 text-[13px] leading-[1.75] text-[#aea7c9]">
            {BUSINESS_INFO.serviceAreas.join(", ")}
          </p>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-6 py-5 text-[12px] text-[#9890b8] lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p>© {new Date().getFullYear()} All Tails. All rights reserved.</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {POLICY_LINKS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
