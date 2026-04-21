# Launch Tracker

Status legend:
- `Launch blocker`
- `In progress`
- `Built but unverified`
- `Needs regression`
- `Nice to have`

## 1. Customer Website

| Area | Status | Notes |
| --- | --- | --- |
| Landing page / conversion funnel | `Built but unverified` | Core public site exists, but legal/footer/commercial copy still needs final launch QA against live pricing and real links. |
| Booking UX | `Needs regression` | Booking, slot selection, payment modes, saved companion hydration, and admin-created bookings are built. This needs final mobile + lifecycle QA. |
| My Bookings | `Needs regression` | Lookup, booking detail, cancel, reschedule, payment retry, and loyalty display exist. Needs end-to-end verification against all booking states. |
| Saved companions | `Needs regression` | Create/edit/archive/by-phone flow and uploads are built. Final regression should confirm no data loss and correct hydration in booking flow. |
| Loyalty experience | `Needs regression` | Loyalty status, reward apply/restore, and complete/cancel flows are in place. Needs repeated lifecycle testing to prove no drift. |

## 2. Customer Messaging & Lifecycle Automation

| Area | Status | Notes |
| --- | --- | --- |
| Booking confirmation messaging | `Launch blocker` | Not yet implemented as a true automated customer communication system with delivery logs and retry handling. |
| Address / live-location collection | `Launch blocker` | No structured booking-linked address/location workflow is present yet. |
| Night-before reminder | `Launch blocker` | Digesting for teams exists, but customer reminder automation is not live. |
| Same-day notifications | `In progress` | Team same-day alerts exist in admin/dispatch. Customer-side same-day lifecycle messaging is not complete. |
| Post-groom care guide | `Launch blocker` | Not implemented as an automated post-completion communication flow. |
| Review request | `Launch blocker` | Not implemented as a booking-completion lifecycle program. |
| Rebooking reminder | `Launch blocker` | No automated retention cadence is live yet. |
| Offers / campaigns | `Nice to have` | Not started as a proper segmentation/campaign layer. |

## 3. Groomer SOP & Service Execution

| Area | Status | Notes |
| --- | --- | --- |
| SOP checklist model | `Launch blocker` | Not yet represented as a first-class execution workflow tied to bookings. |
| SOP media uploads | `In progress` | Generic upload routes exist, but not a structured SOP proof system per step. |
| Payment proof collection | `Launch blocker` | Admin payment state exists, but groomer-side proof capture and reconciliation workflow is missing. |
| Review proof capture | `Launch blocker` | Not yet tracked as part of service closure. |

## 4. Admin Panel

| Area | Status | Notes |
| --- | --- | --- |
| Admin auth foundation | `Built but unverified` | Signed admin login/session flow is built. Needs final production env verification and role planning. |
| Bookings page | `In progress` | Table, drawer, filters, actions, metadata editing, payment links, and richer ops layout are built. Needs full operator QA. |
| Dispatch page | `In progress` | Live board, assign/reassign, digest preview/send, alert history, and relay-call flow exist. Needs daily-ops QA. |
| Teams page | `In progress` | Team editing, Telegram metadata, and coverage management exist. Needs onboarding-style QA and validation pass. |
| Slots page | `In progress` | Slot state viewing, block/unblock/release hold, bulk actions, and range blocking exist. Needs real ops QA and slot-truth regression. |
| Relay / privacy layer | `In progress` | Relay-call session logging exists, but privacy-safe live bridging and stronger fallback policy still need completion. |
| Dispatch digest + alerts | `Built but unverified` | Preview/send/history flows are implemented. Needs real Telegram send verification in production-like conditions. |
| Auditability | `In progress` | Booking events, dispatch logs, refund summaries, and alert history are present. Broader operational audit coverage can still be deepened. |

## 5. Backend Correctness

| Area | Status | Notes |
| --- | --- | --- |
| Slot state correctness | `Needs regression` | Major fixes were made for held/booked/blocked behavior and stale test data. This still needs repeated scenario testing. |
| Payment correctness | `Needs regression` | Razorpay order/retry/verify hardening is in place. Paid-cancel/refund-safe handling exists in admin. Needs end-to-end payment QA. |
| Loyalty correctness | `Needs regression` | Logic is implemented but still needs repeated cancel/reschedule/complete verification to prove stability. |
| Saved companions correctness | `Needs regression` | Strongly built, but still needs final acceptance/regression across upload, archive, and booking hydration paths. |

## 6. Data, Analytics, Observability

| Area | Status | Notes |
| --- | --- | --- |
| Delivery logs for customer/team messaging | `Launch blocker` | Team alert and digest records exist, but there is no complete customer messaging delivery log system yet. |
| Ops event logs | `In progress` | A number of admin actions are now event-logged. Coverage is decent but not yet comprehensive across the whole business workflow. |
| Funnel / retention analytics | `Nice to have` | Not yet implemented as a meaningful decision-making layer. |

## 7. Support & Exception Handling

| Area | Status | Notes |
| --- | --- | --- |
| Failed payment support | `In progress` | Retry-order/payment-link support exists in admin. Customer support handling still needs broader scripted workflows. |
| No slot availability support | `Built but unverified` | Admin tooling can manage slots; operational fallback/customer comms for no-availability cases are still not formalized. |
| Late reschedule / cancellation after payment | `In progress` | Admin reschedule exists; paid-cancel workflow now exists. Policy and edge-case handling still need QA. |
| Missing address / groomer delay / quality complaint / dispute handling | `Launch blocker` | Not yet formalized into systemized support workflows. |

## 8. Legal / Trust / Policy

| Area | Status | Notes |
| --- | --- | --- |
| Privacy policy | `Launch blocker` | Needs real launch-ready legal content and published links. |
| Terms and conditions | `Launch blocker` | Needs real launch-ready legal content and published links. |
| Cancellation / refund policy | `Launch blocker` | Policy must align with actual payment and admin cancellation behavior. |
| Data exposure / media retention / communications consent | `Launch blocker` | Not yet surfaced as a formalized policy layer in the product. |

## 9. Workforce Ops & Groomer System

| Area | Status | Notes |
| --- | --- | --- |
| Groomer app / portal | `Launch blocker` | Not yet built. This should be a restricted groomer-facing system, not the full admin. |
| Workforce admin controls | `Launch blocker` | Admin currently lacks team-member management, workforce roster control, and incentive/discipline management. |
| SOP execution by groomers | `In progress` | SOP exists in admin/QA, but groomer-side step updates and proof upload are not yet built. |
| Gamification / incentive engine | `Launch blocker` | Rank ladder, points, milestones, rewards, and policy controls are still specification-stage only. |
| Leave / salary advance / workforce requests | `Launch blocker` | Not yet implemented. |
| Training / growth / certification layer | `Nice to have` | Not yet implemented, but important for long-term workforce quality. |

## 10. Launch Order

### Priority 1
- Admin QA across `Bookings`, `Dispatch`, `Teams`, and `Slots`
- Slot correctness regression
- Payment + loyalty regression

### Priority 2
- Booking confirmation messaging
- Address / live-location collection
- Night-before reminder
- Post-completion care guide
- Review request

### Priority 3
- SOP checklist system
- SOP media proof uploads
- Payment proof and review proof

### Priority 4
- Support exception workflows
- Relay/privacy hardening
- Broader audit coverage

### Priority 5
- Funnel analytics
- Retention campaigns
- Offer engine
- Final polish

## 11. Honest Read

### Website
- The core booking product is advanced.
- The automation and lifecycle layer is not complete.

### Admin / Ops
- The operational shell is now substantially built and no longer in the earlier “admin APIs failing” state.
- The main gap has shifted from missing pages to final QA, automation, SOP tooling, and business-process hardening.

### Overall
- The product is in a strong pre-launch state.
- It is **not fully complete yet** because the remaining gaps are operationally important, not cosmetic.

## 12. Go-Live Checklist

### Must finish before launch
- WhatsApp provider activation
  - set real production credentials
  - verify webhook
  - prove queued customer messages move to `sent` / `failed`
- Final legal / policy publication
  - privacy policy
  - terms and conditions
  - cancellation / refund policy
  - communications / data handling language
- End-to-end regression on core money + slot truth
  - booking creation
  - slot availability / hold / release / block
  - Razorpay pay-now flow
  - pay-after-service flow
  - cancel / reschedule / refund-safe admin actions
  - loyalty apply / restore / complete lifecycle
- Admin production-readiness QA
  - Bookings
  - Dispatch
  - Teams
  - Slots
  - QA
  - Support
  - Messages
- Groomer field-flow QA on real Android devices
  - login
  - job open from Telegram/session
  - en route / arrived
  - camera-only photo capture
  - video capture 10–15 sec
  - payment save
  - booking complete
- Production env verification
  - admin auth
  - groomer auth
  - uploads
  - Telegram routing
  - cron/scheduled routes

### Safe for soft launch
- Customer website public funnel
  - landing page
  - booking flow
  - My Bookings
  - saved companions
- Customer lifecycle messaging content already prepared in system
  - booking confirmation
  - address follow-up
  - night-before reminder
  - post-groom care
  - review request
  - 5th-week reminder
- Admin ops surfaces that are already functionally built
  - dispatch digest/history
  - same-day alerts
  - QA board
  - support case queue
  - workforce management
- Groomer dashboard/gamification foundation
  - rank progression
  - streaks
  - team leaderboard
  - leave / salary advance requests
  - referrals / training interest
  - profile documents

### Can wait until after launch
- Broader analytics / funnel instrumentation
- Advanced campaign segmentation and offer engine depth
- Instagram / Facebook outbound automation
- More complete audit/report/export surfaces
- Reward-store approval sophistication and richer redemption policy
- Bigger celebration / unlock animations and further groomer-app polish
- Dedicated Android app build
  - current groomer web flow can support soft launch first
- Expanded workforce systems
  - deeper penalties ledger
  - richer training academy
  - advanced promotion panel tooling

## 13. Numbered Launch Execution Sequence

1. Lock production environment and secrets
   - verify production env vars for database, Razorpay, Telegram, admin auth, groomer auth, uploads, and WhatsApp provider
   - confirm cron/scheduled route trigger plan

2. Activate live WhatsApp provider flow
   - set provider credentials
   - verify webhook
   - test queue processing end to end
   - confirm messages move from `queued` to `sent` / `failed`

3. Publish legal and trust pages
   - privacy policy
   - terms and conditions
   - cancellation / refund policy
   - communication/data-handling language
   - confirm footer and public links are real

4. Run booking and slot regression
   - create booking
   - availability truth
   - held / booked / blocked / released behavior
   - admin slot actions
   - no ghost/stale slot states

5. Run payment and loyalty regression
   - pay-now booking
   - payment retry
   - pay-after-service
   - paid cancel / refund-safe path
   - loyalty apply / restore / complete lifecycle

6. Run admin ops QA day
   - Bookings
   - Dispatch
   - Teams
   - Slots
   - QA
   - Support
   - Messages
   - confirm all primary operator actions update correctly

7. Run Telegram ops QA
   - nightly digest send
   - 60-minute groomer reminder
   - 25-minute delay escalation
   - team alert routing
   - admin escalation routing

8. Run groomer field-flow QA on Android
   - login
   - dashboard
   - job open
   - en route / arrived
   - camera-only photo capture
   - short video capture
   - payment image save
   - review screenshot optional path
   - completion + rewards feedback

9. Run customer journey QA on mobile and desktop
   - public booking flow
   - My Bookings
   - saved companions
   - cancel / reschedule
   - payment retry
   - lifecycle messaging visibility/history

10. Soft launch with controlled volume
   - keep operator monitoring active in Dispatch / QA / Support
   - watch message queue, Telegram alerts, slot behavior, and payment edge cases
   - log friction points from real bookings

11. Post-soft-launch hardening
   - fix issues found in live pilot
   - tighten copy/polish
   - improve reports/audit surfaces
   - then move into post-launch items like analytics, advanced campaigns, and dedicated Android app work
