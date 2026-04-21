export type LegalDocumentDefault = {
  slug: "privacy-policy" | "terms-and-conditions" | "cancellation-policy" | "refund-policy";
  title: string;
  summary: string;
  effectiveDate: string;
  body: string;
};

export const LEGAL_DOCUMENT_DEFAULTS: LegalDocumentDefault[] = [
  {
    slug: "privacy-policy",
    title: "Privacy Policy",
    summary:
      "This Privacy Policy explains how All Tails collects and uses information when you browse the website, make a booking, contact support, or use our customer and ops services.",
    effectiveDate: "21 April 2026",
    body: `## Information We Collect
We may collect your name, phone number, city, address details, booking preferences, pet profile information, grooming notes, styling references, and payment status information.

If you upload photos, videos, pet styling references, or operational media during the service process, those files may also be stored as part of the booking record.

## How We Use Your Information
We use your information to:
- create and manage bookings
- assign teams and coordinate service delivery
- send booking updates, reminders, and support communication
- maintain saved companion profiles and service preferences
- track loyalty eligibility and customer support history
- improve service quality, safety, and operational planning

## Communication Channels
We may contact you through phone, WhatsApp, email, or other channels you have used to reach us for booking confirmation, reminders, service updates, care guidance, support, and selected rebooking or offer communication.

Operational and marketing communication should remain relevant and reasonable. You may request that promotional communication be stopped.

## Payments
Online payments are handled through integrated payment partners. All Tails does not store full payment card details on this website.

We may store payment status, order references, and limited transaction identifiers for booking support, reconciliation, and customer service.

## Operational Media and QA Records
During service delivery, All Tails may maintain operational records such as SOP completion logs, dress check images, sanitisation videos, before or after grooming media, payment collection records, and review-related records.

These records are used for quality monitoring, dispute resolution, team coaching, and operational auditing.

## Data Sharing
We do not sell customer personal data. Information may be shared only with internal team members, service partners, payment partners, communication vendors, or technology providers where needed to complete the booking or support the service.

Team members should receive only the information reasonably required to complete the assigned service safely and correctly.

## Data Retention and Security
We retain information for operational, legal, accounting, support, and quality-control purposes for a reasonable period.

We use access controls and internal operational restrictions to reduce unnecessary exposure of customer data. No internet system can be guaranteed fully secure, but we aim to use commercially reasonable safeguards.

## Your Requests
You may contact us to update key contact details, correct saved companion information, or request help regarding your booking history and communication preferences.`,
  },
  {
    slug: "terms-and-conditions",
    title: "Terms & Conditions",
    summary:
      "These Terms & Conditions govern the use of the All Tails website, booking flow, and related services.",
    effectiveDate: "21 April 2026",
    body: `## Service Scope
All Tails provides at-home pet grooming and related service coordination in supported locations. Service availability may depend on city, date, slot capacity, pet profile, and operational coverage.

## Booking Accuracy
Customers should provide accurate contact, pet, service, and location details at the time of booking. Inaccurate or incomplete information may affect confirmation, scheduling, or service delivery.

## Scheduling and Team Assignment
Slot confirmation depends on operational availability. All Tails may assign or reassign teams based on area coverage, schedule constraints, quality requirements, or service conditions.

## Safety and Service Conditions
Customers are expected to disclose any relevant pet behaviour, medical sensitivities, aggression risks, skin issues, or special handling needs before service. All Tails may pause, modify, or refuse service if safety concerns arise.

## Payments
Some bookings may require online payment while others may allow pay-after-service. A booking remains subject to the payment terms selected at the time of checkout.

For prepaid bookings, payment completion may be required before the booking is fully confirmed. If a payment window expires, the hold may be released.

## Photos, Notes, and SOP Records
Operational notes, styling references, service photos, or service-delivery media may be used for quality control, service execution, and support resolution.

## Reschedules, Delays, and Cancellations
Reschedules and cancellations are subject to slot availability, service stage, payment status, and applicable policy. Same-day changes may not always be possible.

## Loyalty and Offers
Loyalty rewards, coupons, campaign offers, and promotional benefits may be subject to eligibility rules, service restrictions, city availability, and operational validation.

All Tails may modify or withdraw promotional programmes where misuse, abuse, or operational inconsistency is detected.

## Limitation of Service
All Tails aims to provide careful and professional service, but results may vary based on coat condition, pet temperament, handling tolerance, grooming history, and styling feasibility.`,
  },
  {
    slug: "cancellation-policy",
    title: "Cancellation Policy",
    summary:
      "This policy explains how All Tails handles booking cancellations and rescheduling.",
    effectiveDate: "21 April 2026",
    body: `## Customer Cancellations
Customers may request cancellation before the service is completed, subject to booking status, slot conditions, and payment mode.

## Same-Day Changes
Same-day cancellations or reschedules can disrupt routing and team planning. All Tails will try to support reasonable requests, but same-day changes may not always be possible.

## Prepaid Bookings
If a prepaid booking is cancelled, refund handling will depend on the stage of the booking, timing of the cancellation, and applicable support review.

## Pay-After-Service Bookings
Pay-after-service bookings may generally be cancelled before completion, subject to operational review where repeated misuse or last-minute disruption is observed.

## Rescheduling
Rescheduling is subject to available booking windows and service-area capacity. If a preferred replacement slot is unavailable, a fresh booking may be required.

## Operational Cancellation
In rare cases, All Tails may need to reschedule or cancel due to safety concerns, operational issues, severe weather, or location constraints. Where applicable, support will help with the next step.

## Loyalty Reward Bookings
If a loyalty-reward booking is cancelled before completion, the reward may be restored where system eligibility and booking history support it.`,
  },
  {
    slug: "refund-policy",
    title: "Refund Policy",
    summary:
      "This policy explains how refunds are reviewed and processed for prepaid All Tails bookings.",
    effectiveDate: "21 April 2026",
    body: `## When Refunds May Apply
Refunds may be reviewed for eligible prepaid bookings when a booking is cancelled before service completion, when All Tails is unable to deliver the confirmed service, or when support determines a payment reversal is appropriate.

## Refund Review
Refund decisions may depend on payment status, cancellation timing, slot usage, operational costs already incurred, support review, and the specific circumstances of the booking.

## Processing Method
Refunds may be processed through the original payment partner, manual bank or UPI transfer, or other supported methods depending on the payment path and support handling.

## Zero-Amount or Loyalty Bookings
Bookings covered fully by loyalty or zero-amount promotions generally do not create a cash refund obligation. Where eligible, the underlying reward may instead be restored.

## Refund Timelines
Timelines may vary depending on the payment partner and banking channel. All Tails may record refund mode, status, and support notes as part of the booking history.`,
  },
];

export const BLOG_POST_DEFAULTS = [
  {
    slug: "how-often-should-you-groom-your-pet",
    title: "How often should you groom your pet?",
    excerpt:
      "Learn how grooming frequency changes based on breed, coat type, lifestyle, and seasonal shedding patterns.",
    category: "Grooming Guide",
    readTimeMinutes: 5,
    coverImageUrl: "/images/blog-1.jpeg",
    body: `Regular grooming needs vary from pet to pet.

Long-haired breeds usually require more frequent grooming, while short-haired pets may need a lighter schedule.

Coat type, shedding cycle, activity level, and skin sensitivity all matter. If you are unsure, start with a routine every 3 to 5 weeks and adjust based on coat condition.

At All Tails, our team can help recommend the right cadence based on your pet's comfort and coat maintenance needs.`,
    isPublished: true,
  },
  {
    slug: "how-to-reduce-grooming-anxiety-in-pets",
    title: "How to reduce grooming anxiety in pets",
    excerpt:
      "Small things you can do before a session to help your pet feel calmer and more comfortable.",
    category: "Comfort Tips",
    readTimeMinutes: 4,
    coverImageUrl: "/images/blog-2.jpeg",
    body: `A calm grooming experience starts before the session begins.

Give your pet some time to settle, avoid overstimulation, and keep water available. Familiar smells, a calm environment, and gentle handling can make a big difference.

If your pet has known triggers, inform the grooming team in advance so the session can be paced correctly.`,
    isPublished: true,
  },
  {
    slug: "which-grooming-package-is-right-for-your-pet",
    title: "Which grooming package is right for your pet?",
    excerpt:
      "Understand when to choose Basic, Hygiene, or Luxury based on your pet’s needs.",
    category: "Choosing a Plan",
    readTimeMinutes: 4,
    coverImageUrl: "/images/blog-3.jpeg",
    body: `Different pets need different levels of grooming support.

Some need a quick hygiene refresh, while others need a complete coat reset with styling and deeper care.

Choosing the right package depends on coat length, matting, skin condition, and how long it has been since the last session.

If you are unsure, our team can help you choose the most suitable option before the booking.`,
    isPublished: true,
  },
] as const;
