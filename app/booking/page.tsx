import { JsonLd } from "../components/seo/JsonLd";
import NewMobileBookingFlow from "../components/booking/NewMobileBookingFlow";
import { pageMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, serviceSchema } from "@/lib/seo/schema";

// /booking is a transactional flow, not informational content. Indexing it
// dilutes topical relevance for "pet grooming" queries (the homepage and
// /packages are the canonical informational landing pages). Keep the page
// crawlable but tell search engines not to index or follow links from it.
export const metadata = pageMetadata({
  title: "Book At-Home Pet Grooming",
  description:
    "Book an at-home pet grooming session with All Tails. Choose a package, check available slots, add pet details, and confirm your grooming session.",
  path: "/booking",
  noindex: true,
});

export default function BookingPage() {
  const breadcrumbs = breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Book", path: "/booking" },
  ]);

  return (
    <>
      <JsonLd data={[serviceSchema(), breadcrumbs]} />
      <NewMobileBookingFlow />
    </>
  );
}
