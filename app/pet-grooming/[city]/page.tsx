import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CityLanding } from "@/app/components/landing/CityLanding";
import { JsonLd } from "@/app/components/seo/JsonLd";
import { SeoPageShell } from "@/app/components/seo/SeoPageShell";
import { CITY_LANDING_SLUGS, getCityLanding } from "@/lib/cities/data";
import { pageMetadata } from "@/lib/seo/metadata";
import {
  breadcrumbSchema,
  cityLocalBusinessSchema,
  faqPageSchema,
  serviceSchema,
} from "@/lib/seo/schema";

// Pre-render every city in CITY_LANDINGS at build time. Unknown slugs
// 404 cleanly via notFound(). dynamicParams=false would also block any
// future slug from being lazily rendered — we keep it default so adding
// a city in the data file picks up at the next deploy.
export function generateStaticParams() {
  return CITY_LANDING_SLUGS.map((slug) => ({ city: slug }));
}

type Params = { city: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { city } = await params;
  const data = getCityLanding(city);
  if (!data) return {};

  const title = `Pet Grooming at Home in ${data.displayName} | Dog & Cat Grooming | All Tails`;
  const description =
    data.metaDescription ??
    `${data.intro.slice(0, 155).trim()}${data.intro.length > 155 ? "…" : ""}`;

  return pageMetadata({
    title,
    description,
    path: `/pet-grooming/${data.slug}`,
  });
}

export default async function CityPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { city } = await params;
  const data = getCityLanding(city);
  if (!data) {
    notFound();
  }

  const breadcrumbs = breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Pet grooming", path: "/pet-grooming" },
    { name: data.displayName, path: `/pet-grooming/${data.slug}` },
  ]);

  const localBusiness = cityLocalBusinessSchema({
    cityName: data.displayName,
    region: data.region,
    slug: data.slug,
    geo: data.geo,
    address: data.address,
    description: data.intro,
    areaServed: data.areas,
  });

  const cityFaq = faqPageSchema(
    data.faqs.map((faq) => ({ q: faq.question, a: faq.answer }))
  );

  return (
    <SeoPageShell>
      <JsonLd data={[localBusiness, serviceSchema(), cityFaq, breadcrumbs]} />
      <CityLanding data={data} />
    </SeoPageShell>
  );
}

