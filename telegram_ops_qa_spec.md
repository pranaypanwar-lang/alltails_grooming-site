# Telegram Ops + QA Workflow Spec

## 1. Goal

Use Telegram as the fast operational messaging layer for:
- team assignment alerts
- same-day updates
- reminder nudges
- QA exception prompts
- lightweight motivation / rewards teasers

Use the website/backend as the system of record for:
- booking state
- SOP step completion
- proof uploads
- payment proof and mismatch tracking
- QA monitoring
- audit history

## 2. Core Product Decision

### Telegram should be
- notification layer
- action launcher
- escalation layer
- motivation layer

### Telegram should not be
- the primary database
- the sole place for SOP proof capture
- the sole source of truth for booking state

Best model:
- Telegram message -> secure action link / mini web flow
- web flow -> updates backend
- backend -> updates QA/admin

## 3. Users

### 3.1 Operations / Admin
- uses admin panel
- views bookings, dispatch, QA, teams, slots

### 3.2 Groomer / Helper / Team
- receives Telegram alerts
- taps secure action links
- updates status
- uploads SOP proofs

### 3.3 QA Team
- monitors QA tab in admin
- receives escalation alerts where needed

## 4. Booking Execution State Machine

Recommended real-time job state flow:

1. `assigned`
2. `en_route`
3. `arrived`
4. `started`
5. `sop_in_progress`
6. `payment_proof_pending`
7. `qa_pending`
8. `completed`
9. `issue`

Notes:
- `assigned`, `en_route`, `started`, `completed`, `issue` already align closely with current admin dispatch logic
- `arrived`, `sop_in_progress`, `payment_proof_pending`, and `qa_pending` can be derived or stored later

## 5. Telegram Workflow Model

## 5.1 Assignment alert

Trigger:
- when booking is assigned to team

Target:
- team Telegram chat or assigned groomer chat

Message purpose:
- notify job
- provide fast context
- launch action flow

### Template

**English**
```text
New job assigned

Booking: {booking_short_id}
Service: {service_name}
Area: {city_or_service_area}
Time: {window_label}
Customer: {customer_first_name}
Pets: {pet_summary}

Next step: Tap below when you start travel.
Reward hint: Complete all SOP steps for this job to earn performance points.
```

**Simple Hindi**
```text
Nayi booking assign hui hai

Booking: {booking_short_id}
Service: {service_name}
Area: {city_or_service_area}
Time: {window_label}
Customer: {customer_first_name}
Pets: {pet_summary}

Agla step: Travel shuru karte hi neeche tap karein.
Reward hint: Is job ke sabhi SOP steps complete karne par performance points milenge.
```

### Buttons / links
- `Mark En Route`
- `Open Job`
- `Need Help`

## 5.2 En-route reminder

Trigger:
- if job still `assigned` within configured threshold before slot start

Message purpose:
- push timely dispatch movement

### Template

**English**
```text
Reminder: your booking is about to begin soon.
Please mark En Route when you leave.
```

**Simple Hindi**
```text
Reminder: aapki booking ka time paas aa raha hai.
Nikalte hi En Route mark karein.
```

## 5.3 Arrival reminder

Trigger:
- if `en_route` is marked but `arrived` not confirmed near slot start

### Template

**English**
```text
Please confirm arrival for booking {booking_short_id}.
```

**Simple Hindi**
```text
Booking {booking_short_id} ke liye arrival confirm karein.
```

Buttons:
- `Mark Arrived`
- `Open SOP`

## 5.4 SOP proof reminder

Trigger:
- required step or proof still missing after job start

### Template

**English**
```text
SOP reminder for booking {booking_short_id}

Pending proof: {missing_step_label}
Please upload it to keep QA complete.
```

**Simple Hindi**
```text
Booking {booking_short_id} ke liye SOP reminder

Pending proof: {missing_step_label}
QA complete rakhne ke liye upload karein.
```

Buttons:
- `Upload Proof`
- `Open SOP`

## 5.5 Payment proof reminder

Trigger:
- service marked done but payment proof not recorded

### Template

**English**
```text
Payment proof pending for booking {booking_short_id}.
Please record payment before closing the job.
```

**Simple Hindi**
```text
Booking {booking_short_id} ke liye payment proof pending hai.
Job close karne se pehle payment record karein.
```

Buttons:
- `Record Payment`
- `Upload Screenshot`

## 5.6 Completion / reward teaser message

Trigger:
- all required SOP complete
- payment proof complete

### Template

**English**
```text
Job completed successfully.

Booking: {booking_short_id}
Great work.
Progress earned: +{points_earned} points
Next milestone: {next_milestone_label}
```

**Simple Hindi**
```text
Job successfully complete ho gayi.

Booking: {booking_short_id}
Bahut badhiya.
Progress earned: +{points_earned} points
Agla milestone: {next_milestone_label}
```

## 6. Button / Link Behavior

Recommended behavior:
- Telegram message buttons open secure mobile web links
- links are booking-specific and short-lived where needed
- link opens lightweight page optimized for phone

Examples:
- `/groomer/jobs/{token}`
- `/groomer/jobs/{token}/sop`
- `/groomer/jobs/{token}/proof?step=pre_groom_video`
- `/groomer/jobs/{token}/payment`

### Why links over chat parsing
- structured
- auditable
- easier file mapping
- less ambiguity
- better QA compatibility

## 7. Proof Capture Options

## 7.1 Recommended option: secure web upload

Flow:
- Telegram button opens mobile web upload page
- groomer selects proof step
- uploads image/video
- backend stores proof under booking + SOP step
- QA tab updates immediately

Advantages:
- clean booking linkage
- exact step mapping
- audit trail
- easier validation
- no caption parsing complexity

## 7.2 Temporary fallback option: Telegram-native proof reply

Possible but not preferred.

Flow:
- groomer replies to bot with image/video
- must include step identifier or action token
- backend parses and maps to booking + SOP step

Example caption format:
```text
#BT123 sanitization_proof
```

Risks:
- wrong caption
- wrong booking mapping
- duplicate media confusion
- poor user discipline

Conclusion:
- okay as fallback
- not ideal as primary workflow

## 8. QA Management Through Telegram

Telegram should support QA by sending exception alerts, not by becoming the QA database.

## 8.1 QA exception triggers

Send alerts when:
- booking still `assigned` near start time
- `en_route` not marked in time
- `arrived` not marked
- required SOP proof missing
- payment proof missing
- payment mismatch flagged
- repeated overdue proof on same job

Targets:
- assigned team
- ops lead
- QA monitor group for high-severity cases

## 8.2 Example QA alert

**English**
```text
QA alert

Booking: {booking_short_id}
Problem: {issue_label}
Required action: {action_label}
```

**Simple Hindi**
```text
QA alert

Booking: {booking_short_id}
Problem: {issue_label}
Required action: {action_label}
```

## 9. Reward / Motivation Teasers In Telegram

Keep this short and positive.

Examples:
- `Complete all SOP steps for this job to earn +20 points`
- `1 more verified review unlocks your next bonus`
- `You are on a 6-day punctuality streak`
- `This week full utilisation keeps you eligible for your weekly bonus`
- `No leave streak is active — stay consistent to unlock your reward`

Rules:
- one teaser per major operational message
- no spam
- no false promises
- tie to real backend milestones

## 10. Bilingual Copy Approach

Website and operational messaging should be English-first with simple Hindi support.

### 10.1 Customer-facing
- English main copy
- simple Hindi helper text in critical actions
- payment / booking / reminder language should remain easy to understand

### 10.2 Groomer-facing
- bilingual is even more important
- short English + simple Hindi copy works best

Recommended pattern:
```text
Mark En Route / Nikalte hi mark karein
Upload proof / Proof upload karein
Payment recorded / Payment record ho gaya
```

### 10.3 Copy principles
- no heavy literary Hindi
- simple spoken Hindi
- short sentences
- action-first phrasing

## 11. Operational Message Catalog

Core messages needed:
- assignment
- en-route reminder
- arrival reminder
- SOP pending reminder
- payment proof reminder
- same-day change alert
- cancellation alert
- escalation alert
- completion + points teaser
- weekly progress digest for groomers

## 12. Weekly Groomer Progress Digest

Optional but recommended after launch.

Include:
- jobs completed this week
- punctuality status
- review count
- SOP completion rate
- current points
- next reward milestone

## 13. Backend Requirements

Need:
- Telegram send service
- template builder
- action-link signer / token service
- groomer action endpoints
- proof upload endpoints
- message send log
- failure/retry handling
- QA exception rules

## 14. Admin Requirements

Admin must be able to:
- see sent Telegram messages
- see failures
- resend messages
- preview templates
- configure teaser messages
- configure timing thresholds
- inspect QA exception history

## 15. Build Order

### Phase 1
- address/location status in admin + dispatch
- Telegram action-link architecture
- groomer lightweight job action pages

### Phase 2
- SOP proof upload via secure links
- QA reminder alerts
- payment proof reminders

### Phase 3
- reward teaser insertions
- bilingual template system
- weekly groomer digest

## 16. Strong Recommendation

Best long-term model:
- Telegram = fast alert and motivation layer
- web/mobile flow = structured state + proof capture
- admin QA tab = monitoring and audit layer

This gives speed without losing structure.
