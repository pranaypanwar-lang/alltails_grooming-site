import Link from "next/link";

import { JsonLd } from "../components/seo/JsonLd";
import { SeoPageShell } from "../components/seo/SeoPageShell";
import { pageMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, faqPageSchema } from "@/lib/seo/schema";

export const metadata = pageMetadata({
  title: "Pet Grooming FAQs",
  description:
    "Find answers about at-home pet grooming, anxious pets, safe products, grooming duration, package inclusions, payments, service areas, and booking support.",
  path: "/faq",
});

type FaqItem = { q: string; a: string };
type FaqGroup = { title: string; items: FaqItem[] };

const FAQ_GROUPS: FaqGroup[] = [
  {
    title: "Booking and slots",
    items: [
      {
        q: "How do I book an at-home grooming session?",
        a: "Choose a package on our packages page, share your city and preferred date, and our team confirms an available slot. You can also message us on WhatsApp for help.",
      },
      {
        q: "Do I need to bring my pet anywhere?",
        a: "No. All Tails is a doorstep pet grooming service. Our groomer visits your home at the booked slot.",
      },
      {
        q: "How long is a grooming session?",
        a: "Sessions typically range from 60 to 120 minutes depending on the package, coat condition, and your pet's comfort level.",
      },
    ],
  },
  {
    title: "Packages and pricing",
    items: [
      {
        q: "What is included in a full pet grooming session?",
        a: "A full grooming session may include bath, blow dry, brushing, nail trimming, ear cleaning, hygiene trimming, paw care, and haircut or styling depending on the package selected.",
      },
      {
        q: "Which package should I choose for my dog?",
        a: "Essential Care is a bath-only upkeep package. Signature Care adds hygiene trimming and is our most-booked. Complete Pampering includes a full-body haircut and styling.",
      },
    ],
  },
  {
    title: "At-home grooming safety",
    items: [
      {
        q: "Is at-home grooming safe for anxious pets?",
        a: "At-home grooming can be more comfortable for many anxious pets because they stay in a familiar environment. Our groomers use calm handling, short pauses when needed, and pet-safe products during the session.",
      },
      {
        q: "Do you handle senior or first-time pets?",
        a: "Yes. Please share any health notes or sensitivities while booking so the groomer can plan accordingly.",
      },
    ],
  },
  {
    title: "Products and hygiene",
    items: [
      {
        q: "What products do groomers use?",
        a: "Our groomers carry shampoos, conditioners, and finishing products selected for everyday pet skin and coat care. Tools are sanitised between sessions.",
      },
    ],
  },
  {
    title: "Payments and cancellations",
    items: [
      {
        q: "What payment options are available?",
        a: "You can pay online when confirming the booking, or choose to pay after the grooming session is complete. Online prepayment helps secure your slot instantly.",
      },
      {
        q: "Can I cancel or reschedule?",
        a: "Yes. Please refer to our cancellation policy or message us on WhatsApp for help with rescheduling.",
      },
    ],
  },
  {
    title: "Service areas",
    items: [
      {
        q: "Which cities does All Tails serve?",
        a: "All Tails currently serves selected areas across Delhi, Gurgaon/Gurugram, Noida, Greater Noida, Ghaziabad, Faridabad, Chandigarh, Mohali, Panchkula, Kharar, Ludhiana, and Patiala.",
      },
    ],
  },
];

export default function FaqPage() {
  const breadcrumbs = breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "FAQs", path: "/faq" },
  ]);

  const faqSchema = faqPageSchema(
    FAQ_GROUPS.flatMap((group) => group.items)
  );

  return (
    <SeoPageShell>
      <JsonLd data={[faqSchema, breadcrumbs]} />

      <section className="mx-auto max-w-[860px] px-5 py-14 lg:px-8 lg:py-20">
        <div className="text-center">
          <span className="inline-flex rounded-full border border-[#e8ddff] bg-white px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#7a5ce0]">
            FAQs
          </span>
          <h1 className="mt-5 text-[34px] font-black leading-[1.1] tracking-[-0.04em] text-[#2a2346] lg:text-[44px]">
            Pet Grooming FAQs
          </h1>
          <p className="mx-auto mt-4 max-w-[680px] text-[16px] leading-[1.8] text-[#6b7280]">
            Find answers about at-home pet grooming, package inclusions,
            anxious pets, safe products, payments, and service areas.
          </p>
        </div>

        <div className="mt-12 space-y-12">
          {FAQ_GROUPS.map((group) => (
            <section key={group.title}>
              <h2 className="text-[20px] font-black tracking-[-0.02em] text-[#2a2346]">
                {group.title}
              </h2>
              <div className="mt-5 divide-y divide-[#ece5fb] rounded-[24px] border border-[#ece5fb] bg-white">
                {group.items.map((item) => (
                  <details
                    key={item.q}
                    className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between text-[16px] font-semibold text-[#2a2346]">
                      <span>{item.q}</span>
                      <span
                        aria-hidden
                        className="ml-4 text-[20px] text-[#6d5bd0] transition group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <p className="mt-3 text-[15px] leading-[1.75] text-[#6b7280]">
                      {item.a}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-16 rounded-[24px] border border-[#ece5fb] bg-white p-8 text-center">
          <h2 className="text-[20px] font-black tracking-[-0.02em] text-[#2a2346]">
            Still have a question?
          </h2>
          <p className="mt-2 text-[14px] leading-[1.7] text-[#6b7280]">
            Reach out and our team will help you choose the right grooming
            session.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/contact"
              className="inline-flex items-center rounded-full border border-[#cdbcf5] bg-white px-5 py-2.5 text-[13px] font-semibold text-[#5f4fc2] hover:bg-[#f4efff]"
            >
              Contact All Tails
            </Link>
            <Link
              href="/booking"
              className="inline-flex items-center rounded-full bg-[#6d5bd0] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-[#5f4fc2]"
            >
              Book a session
            </Link>
          </div>
        </div>
      </section>
    </SeoPageShell>
  );
}
