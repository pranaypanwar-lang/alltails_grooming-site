import Link from "next/link";
import Image from "next/image";

const NAV_ITEMS = [
  { href: "/packages", label: "Packages" },
  { href: "/booking", label: "Book" },
  { href: "/faq", label: "FAQs" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-[#ece5fb] bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-3 lg:px-8">
        <Link href="/" aria-label="All Tails home" className="flex items-center gap-2">
          <Image
            src="/images/logo-1.png"
            alt="All Tails logo"
            width={120}
            height={32}
            priority
            className="h-8 w-auto"
          />
        </Link>

        <nav aria-label="Primary" className="hidden gap-7 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[14px] font-semibold tracking-[-0.01em] text-[#3a3458] hover:text-[#6d5bd0]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/booking"
          className="inline-flex items-center rounded-full bg-[#6d5bd0] px-4 py-2 text-[13px] font-semibold text-white shadow-[0_8px_24px_rgba(109,91,208,0.32)] hover:bg-[#5f4fc2]"
        >
          Book Now
        </Link>
      </div>
    </header>
  );
}
