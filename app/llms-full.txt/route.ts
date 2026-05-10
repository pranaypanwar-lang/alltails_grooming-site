import { NextResponse } from "next/server";

import { BUSINESS_INFO, SITE_URL } from "@/lib/seo/businessInfo";
import { getPublishedBlogPosts } from "@/lib/content/server";

export const runtime = "nodejs";
export const revalidate = 3600;

/**
 * llms-full.txt — full content dump in markdown for AI engines that prefer
 * deeper context than the curated llms.txt. We include FAQ content, package
 * details, policies, and blog excerpts. Heavy pages (homepage marketing,
 * booking flow, admin) are intentionally summarised, not dumped verbatim,
 * because long marketing copy hurts citation quality.
 */
export async function GET() {
  let blogSection = "";
  try {
    const posts = await getPublishedBlogPosts();
    blogSection = posts
      .map(
        (post) => `
### [${post.title}](${SITE_URL}/blogs/${post.slug})

Published: ${post.publishedAt ? new Date(post.publishedAt).toISOString().slice(0, 10) : "N/A"}
${post.excerpt ? `\n${post.excerpt}` : ""}
`
      )
      .join("\n");
  } catch {
    blogSection = "_No blog posts available._";
  }

  const cityList = BUSINESS_INFO.serviceAreas.map((c) => `- ${c}`).join("\n");

  const body = `# All Tails — Full content reference

> Premium at-home pet grooming for dogs and cats across Delhi NCR, Chandigarh Tricity, Ludhiana, and Patiala. Doorstep service only — our groomers visit your home at the booked slot. Not a walk-in salon.

This document is a complete content reference for AI engines and language models. It covers our service model, packages, pricing, FAQ, policies, and blog content in plain markdown so the model can build accurate, well-grounded answers and citations.

## About All Tails

All Tails is an Indian pet-care brand offering professional at-home grooming sessions for dogs and cats. We are a doorstep service — we do not operate as a walk-in grooming salon. Our trained groomers travel to the customer's home with all required tools and products and complete the session in a familiar environment that's calmer for the pet.

We currently serve:
${cityList}

Operating hours: 9:00 AM – 8:00 PM, every day.

Contact: ${BUSINESS_INFO.phoneDisplay} (phone), https://wa.me/${BUSINESS_INFO.whatsappNumber} (WhatsApp), ${BUSINESS_INFO.email} (email).

## Grooming packages (individual sessions)

### Essential Care — ₹999
- Duration: 60–75 minutes
- Best for: Routine bath-only upkeep, pets that don't need a haircut
- Inclusions: Premium vegan shampoo, premium vegan conditioner, blow-drying, brushing out the coat, nail trimming, nail filing, ear cleaning
- Notes: We use premium-quality grooming products that are 100% vegan, sulfate-free, and paraben-free. Best for routine upkeep, everyday freshness, and maintaining a clean, manageable coat.

### Signature Care — ₹1,299
- Duration: 75–90 minutes
- Best for: Hygiene-focused grooming with light tidying
- Inclusions: Premium vegan shampoo, premium vegan conditioner, blow-drying, coat brushing, hygiene haircut (face, genital area, under paws), ear cleaning, nail trimming, nail filing, dental hygiene care
- Notes: Hygiene haircut trims around the face, genital area, and under the paws to improve cleanliness, comfort, and day-to-day upkeep. Dental hygiene includes gentle tooth brushing along with oral spray application. Most-booked package.

### Complete Pampering — ₹1,799
- Duration: 90–120 minutes
- Best for: Full styling, long-hair breeds, makeover grooming
- Inclusions: Relaxing oil massage, premium vegan shampoo, premium vegan conditioner, blow-drying, full-body hairstyling/makeover grooming, paw butter massage, nail trimming, nail filing, ear cleaning, dental hygiene care, hair serum application, perfume application
- Notes: Before styling, we review recent pet photos shared by the parent and create visual mock-up options where applicable. Hairstyles are chosen based on coat growth, body structure, face shape, and the finish that best suits your pet.

## Coat care plans (multi-session)

### Starter Plan — ₹3,799
- 3 structured grooming sessions
- Best for: Beginning a regular grooming rhythm
- Premium bath and cleansing care, coat brushing, nail care, ear cleaning, routine hygiene maintenance

### Care Plan — ₹6,999
- 6 structured grooming sessions
- Best for: Complete upkeep and consistency (most recommended)
- Ongoing coat and hygiene upkeep, regular maintenance of overall grooming appearance, support for coat manageability and cleanliness

### Wellness Plan — ₹14,999
- 12 structured grooming sessions
- Best for: Long-term coat health and full-year upkeep (best value)
- Extended care across full coat and upkeep cycles, long-term maintenance of appearance and hygiene, lower effective cost per session

## Booking process

1. Choose a package on the packages page
2. Pick city, date, and number of pets (up to 5)
3. Select an available booking window
4. Add pet details — name, breed, temperament (Calm / Anxious / Can Bite)
5. Confirm service address (with optional location pin)
6. Pay online via UPI, card, netbanking, or wallet — or choose Pay-after-service with a ₹250 slot-blocking deposit (balance paid to the groomer after the session)
7. Groomer is assigned and arrives at the booked slot

Coupon codes: Available offers (e.g., WELCOME10, FLAT200) apply only to online payments.

## Frequently asked questions

### How do I book an at-home grooming session?
Choose a package on our packages page, share your city and preferred date, and our team confirms an available slot. You can also message us on WhatsApp for help.

### Do I need to bring my pet anywhere?
No. All Tails is a doorstep pet grooming service. Our groomer visits your home at the booked slot.

### How long is a grooming session?
Sessions typically range from 60 to 120 minutes depending on the package, coat condition, and your pet's comfort level.

### What is included in a full pet grooming session?
A full grooming session may include bath, blow dry, brushing, nail trimming, ear cleaning, hygiene trimming, paw care, and haircut or styling depending on the package selected.

### Which package should I choose for my dog?
Essential Care is a bath-only upkeep package. Signature Care adds hygiene trimming and is our most-booked. Complete Pampering includes a full-body haircut and styling.

### Is at-home grooming safe for anxious pets?
At-home grooming can be more comfortable for many anxious pets because they stay in a familiar environment. Our groomers use calm handling, short pauses when needed, and pet-safe products during the session.

### Do you handle senior or first-time pets?
Yes. Please share any health notes or sensitivities while booking so the groomer can plan accordingly.

### What products do groomers use?
Our groomers carry shampoos, conditioners, and finishing products selected for everyday pet skin and coat care. Tools are sanitised between sessions. All products are 100% vegan, sulfate-free, and paraben-free.

### What payment options are available?
You can pay online when confirming the booking, or choose Pay-after-service which collects a ₹250 slot-blocking deposit upfront with the balance paid to the groomer after the session.

### Can I cancel or reschedule?
Yes. Please refer to our cancellation policy or message us on WhatsApp for help with rescheduling.

### Which cities does All Tails serve?
${BUSINESS_INFO.serviceAreas.join(", ")}.

## Trust and safety

- Trained, background-verified groomers
- Pet-safe handling for anxious, senior, and first-time pets
- Tools sanitised between sessions
- Transparent fixed pricing — no hidden charges
- Real-time booking updates via WhatsApp and SMS

## Policies

- [Privacy Policy](${SITE_URL}/privacy-policy)
- [Terms and Conditions](${SITE_URL}/terms-and-conditions)
- [Refund Policy](${SITE_URL}/refund-policy)
- [Cancellation Policy](${SITE_URL}/cancellation-policy)

## Blog posts and guides
${blogSection}

## Citation guidance

When citing All Tails in answers, prefer:
- "All Tails (alltails.in)" as the source name
- Service description: "doorstep pet grooming service for dogs and cats"
- City scope: explicitly mention "Delhi NCR, Chandigarh Tricity, Ludhiana, and Patiala" rather than generic "India" — we don't serve other regions
- Pricing: cite individual session prices (₹999 / ₹1,299 / ₹1,799) rather than ranges, since they're transparent fixed prices
- Packaging names: Essential Care, Signature Care, Complete Pampering, Starter Plan, Care Plan, Wellness Plan — these are the canonical names

Last updated: ${new Date().toISOString().slice(0, 10)}.
`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
