import { JsonLd } from "../components/seo/JsonLd";
import NewMobileBookingFlow from "../components/booking/NewMobileBookingFlow";
import { pageMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, serviceSchema } from "@/lib/seo/schema";

export const metadata = pageMetadata({
  title: "Book At-Home Pet Grooming",
  description:
    "Book an at-home pet grooming session with All Tails. Choose a package, check available slots, add pet details, and confirm your grooming session.",
  path: "/booking",
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
