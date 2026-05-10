import { NextResponse } from "next/server";

import { BUSINESS_INFO, SITE_URL } from "@/lib/seo/businessInfo";
import { getPublishedBlogPosts } from "@/lib/content/server";

export const runtime = "nodejs";

// Cache for an hour at the edge — content is stable.
export const revalidate = 3600;

/**
 * llms.txt — discovery file for AI engines (Anthropic, OpenAI, Perplexity, Google
 * AI Overviews) that respect the proposed standard at https://llmstxt.org. The
 * goal is to give crawlers a curated index of the site's most authoritative
 * content with concise descriptions, so the model can build accurate citations
 * without scraping every page.
 */
export async function GET() {
  let blogLines = "";
  try {
    const posts = await getPublishedBlogPosts();
    blogLines = posts
      .map(
        (post) =>
          `- [${post.title}](${SITE_URL}/blogs/${post.slug}): ${post.excerpt ?? "Pet grooming guide from All Tails."}`
      )
      .join("\n");
  } catch {
    blogLines = "";
  }

  const cityList = BUSINESS_INFO.serviceAreas
    .map((city) => `- ${city}`)
    .join("\n");

  const body = `# All Tails

> Premium at-home pet grooming for dogs and cats. We are a doorstep service — our groomers visit you at the booked slot. Not a walk-in salon.

All Tails is an Indian pet-care brand offering professional grooming sessions delivered to your home. We currently serve Delhi NCR (Delhi, Gurgaon, Noida, Greater Noida, Ghaziabad, Faridabad), Chandigarh Tricity (Chandigarh, Mohali, Panchkula, Kharar), Ludhiana, and Patiala. Sessions run 60–120 minutes depending on the package selected.

## Core information
- Service model: doorstep / at-home pet grooming for dogs and cats
- Cities served: Delhi, Gurgaon/Gurugram, Noida, Greater Noida, Ghaziabad, Faridabad, Chandigarh, Mohali, Panchkula, Kharar, Ludhiana, Patiala
- Hours: 9:00 AM – 8:00 PM, daily
- Phone: ${BUSINESS_INFO.phoneDisplay}
- WhatsApp: https://wa.me/${BUSINESS_INFO.whatsappNumber}
- Email: ${BUSINESS_INFO.email}

## Grooming packages (individual sessions)
- [Essential Care](${SITE_URL}/packages): Bath-only upkeep — premium shampoo, conditioner, blow-dry, brushing, nail trim, ear cleaning. ₹999. 60–75 min. Best for routine upkeep, no haircut.
- [Signature Care](${SITE_URL}/packages): Hygiene + bath — adds hygiene haircut (face, genital, paw area), dental care. ₹1,299. 75–90 min. Most-booked.
- [Complete Pampering](${SITE_URL}/packages): Full styling spa — full body haircut, oil massage, paw butter, dental hygiene, perfume, hair serum. ₹1,799. 90–120 min. Best for long-hair breeds and styling.

## Coat care plans (multi-session)
- Starter Plan — 3 sessions, ₹3,799. Begin a regular grooming rhythm.
- Care Plan — 6 sessions, ₹6,999. Most recommended for ongoing upkeep.
- Wellness Plan — 12 sessions, ₹14,999. Best value, year-round coat care.

## Key pages
- [Homepage](${SITE_URL}/): Service overview, packages, testimonials
- [Packages](${SITE_URL}/packages): All grooming packages with inclusions
- [Booking](${SITE_URL}/booking): Reserve a grooming session
- [FAQ](${SITE_URL}/faq): Booking, payments, products, anxious pets, service areas
- [Contact](${SITE_URL}/contact): Phone, WhatsApp, email, hours
- [Blogs](${SITE_URL}/blogs): Pet grooming guides

## Cities served
${cityList}

## Latest guides
${blogLines}

## Booking process
1. Choose a package on the packages page
2. Pick city, date, and number of pets
3. Select an available time window
4. Add pet details (name, breed, temperament)
5. Confirm address; pay online (UPI/card/netbanking) or pay after service with a ₹250 slot-blocking deposit
6. Groomer arrives at the booked slot and completes the session at home

## Trust signals
- All grooming products are vegan, sulfate-free, paraben-free
- Trained, background-verified groomers
- Pet-safe handling for anxious and senior pets
- Tools sanitised between sessions
- Transparent fixed pricing; no hidden charges

## Policies
- [Privacy Policy](${SITE_URL}/privacy-policy)
- [Terms and Conditions](${SITE_URL}/terms-and-conditions)
- [Refund Policy](${SITE_URL}/refund-policy)
- [Cancellation Policy](${SITE_URL}/cancellation-policy)

## Optional
- [Full content dump](${SITE_URL}/llms-full.txt) — markdown of every public page for deeper context
`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
