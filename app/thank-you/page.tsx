import { ThankYouClient } from "./ThankYouClient";

// Thank-you page is the canonical conversion-pageview URL for Google Ads
// and Meta tracking. URL-based conversion firing is more reliable than
// purely event-based — it survives ad blockers that suppress gtag.js but
// don't suppress page navigation.
//
// noindex because this is a transactional confirmation page, not content
// that should appear in search results.
export const metadata = {
  title: "Thanks — your grooming request is in | All Tails",
  description: "Your pet grooming request is received. Our team will reach out shortly on WhatsApp or phone.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function ThankYouPage() {
  return <ThankYouClient />;
}
