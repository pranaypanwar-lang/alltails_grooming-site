# Groomer Workforce Ops + Gamification Spec

## 1. Product Goal

Build a dedicated workforce system for groomers and helpers that:
- lets management assign and monitor work
- lets groomers execute SOP in a controlled workflow
- rewards service quality, discipline, reliability, and growth
- supports workforce operations such as leave, salary advance, training, and referrals
- gives admin full visibility and control through the existing admin panel

This should be implemented as:
- `Admin workforce management surface`
- `Android-first groomer app`
- shared backend engine for jobs, SOP, scoring, incentives, and workforce policy

## 2. Core Product Decision

### Recommended operating model

- Admin/ops continues to use the full admin panel
- Groomers and helpers use a restricted Android app
- QA team uses the QA tab in admin
- Team leads may later get a limited supervisor view

### Not recommended as primary approach

- Google Forms for SOP proof
- full admin-panel access for groomers

Reason:
- weak auditability
- poor privacy control
- poor media structure
- hard to scale discipline/incentives/training

## 3. Admin-Side Workforce Requirements

These must be visible and manageable from admin.

### 3.1 Team member management

Admin should be able to:
- add team members
- edit team member profile
- mark active/inactive
- assign role:
  - `groomer`
  - `helper`
  - `team_lead`
- assign default team
- move member between teams
- create new teams
- amend old team composition
- view team composition history

### 3.2 Workforce profile fields

Each team member should support:
- full name
- phone
- emergency contact
- role
- current team
- employment start date
- probation status
- active/inactive
- payout method metadata
- city/base location
- documents
- training status
- rank
- points
- trust score
- incentive eligibility
- salary advance eligibility

### 3.3 Workforce dashboards in admin

Admin should get dedicated views for:
- team roster
- member profile
- attendance / punctuality
- leave requests
- salary advance requests
- incentives ledger
- penalties ledger
- rank ladder progress
- training completion
- referral performance
- review performance
- payment mismatch incidents

## 4. Groomer Android App

## 4.1 Main screens

### Authentication
- login with OTP or secure phone-based login

### Home
- today’s assigned jobs
- today’s score summary
- rank / level progress
- streaks
- alerts from ops

### My Jobs
- assigned bookings list
- booking detail
- customer masked details where appropriate
- route and time information
- status actions:
  - `accept job`
  - `en route`
  - `arrived`
  - `started`
  - `completed`

### SOP Checklist
- per-booking checklist
- mandatory steps in order
- proof upload
- notes if needed
- block completion until required proof is provided

### Rewards
- rank
- points
- weekly/monthly incentive summary
- milestone progress
- earned rewards history

### Training
- SOP learning modules
- grooming skill upgrades
- customer etiquette
- hygiene
- character building
- personal finance management
- certifications / badges

### Leave
- apply for leave
- emergency leave
- leave balance / earned paid leave visibility

### Salary Advance
- eligibility
- request flow
- request history

### Referrals
- invite code / phone referral
- referral status
- referral bonuses earned

### Profile
- profile details
- documents
- policy acknowledgements

## 5. Gamification Framework

The system should use 4 layers:

### 5.1 XP

Used for:
- level progression
- rank advancement
- visible progress bar

XP should be earned frequently so the app feels rewarding.

### 5.2 Reward Points

Used for:
- redeemable or milestone rewards
- cash incentives
- leave rewards
- gift milestones

### 5.3 Trust Score

Used for:
- salary advance eligibility
- high-value reward eligibility
- promotion readiness
- supervisor trust

### 5.4 Performance Score

Used for:
- monthly evaluation
- salary hike readiness
- top-performer identification
- disciplinary review

## 6. Rank Ladder

Recommended initial ladder:
- `Bronze Groomer`
- `Silver Groomer`
- `Gold Groomer`
- `Platinum Groomer`
- `Elite Groomer`
- `Master Groomer`

Alternative for helpers:
- `Bronze Helper`
- `Silver Helper`
- `Gold Helper`
- `Senior Helper`

Rank should unlock:
- salary hike eligibility
- incentive multiplier
- extra paid leave eligibility
- preferred assignment priority
- promotion pathway

## 7. Exact Point Rules

These are starting rules and can be tuned later.

### 7.1 Job execution
- completed booking: `+20 XP`, `+10 reward points`
- all required SOP steps completed: `+10 XP`
- all proof uploaded correctly: `+10 XP`
- same-day recovery / emergency job covered: `+15 XP`

### 7.2 Quality
- verified successful review: `+25 XP`, `+15 reward points`
- 5 reviews milestone: `+100 reward points`
- 10 reviews milestone: `+250 reward points`
- no complaint on job after 72 hours: `+5 XP`
- repeat customer requesting same groomer: `+20 XP`

### 7.3 Discipline and reliability
- on-time arrival: `+5 XP`
- zero late arrivals in a week: `+50 reward points`
- zero leave in 30 days: `+75 reward points`
- zero leave in 90 days: `+250 reward points`
- full assigned slot utilisation in a week: `+300 reward points`

### 7.4 Growth
- complete training module: `+30 XP`
- complete certification track: `+100 XP`
- mentor junior successfully: `+50 XP`
- pass quarterly skill review: `+150 XP`

### 7.5 Referrals
- valid referred candidate joins: `+100 reward points`
- referral survives probation: `+300 reward points`

## 8. Monetary Incentives

Initial recommended incentives:
- 5 verified reviews: `₹500`
- full weekly slot utilisation: `₹2,000`
- zero complaint month: monthly bonus
- punctuality streak bonus
- training completion bonus for select modules
- referral bonus

## 9. Reward Milestones

Need both small and large rewards.

### 9.1 Small rewards
- recharge / meal vouchers
- fuel allowance
- grooming kit
- festival extras

### 9.2 Medium rewards
- cash bonus
- extra paid leave day
- rank bonus
- preferred schedule access

### 9.3 Big milestone rewards
- salary hike after sustained score + rank threshold
- paid vacation / tourist destination trip
- bike / scooter milestone support
- high-value gadget
- promotion to senior groomer / team lead

## 10. Salary Hike Logic

Salary hike should never be only “gamified” without control.

Recommended criteria:
- minimum tenure threshold
- minimum trust score
- minimum performance score
- minimum rank
- low complaint rate
- no major discipline incident in review period
- training completion threshold

Suggested rule:
- every salary hike requires both:
  - `points / rank threshold`
  - `manager approval`

## 11. Penalties and Discipline

This must be rule-based and fair.

### 11.1 Penalty events
- late for booking: `₹200` penalty
- no-show: stronger penalty + trust score hit
- last-minute leave
- cancellation caused by workforce failure
- incomplete SOP
- missing proof
- payment mismatch
- verified customer complaint
- misconduct / rude behavior
- fake proof / fraud

### 11.2 Recommended discipline model

Do not rely only on salary deductions.

Use ladder:
- warning
- reward point deduction
- trust score deduction
- bonus ineligibility
- monetary penalty where policy allows
- escalation to manager review

### 11.3 Cancellation-cost handling

If last-minute leave causes cancellation:
- actual loss should be recorded
- deduction should not be hardcoded without policy approval
- management should have override

## 12. Leave Management

Needs:
- planned leave request
- emergency leave request
- manager approval
- leave calendar
- leave reason capture
- impact visibility

Types:
- unpaid leave
- earned leave
- sick leave
- emergency leave
- reward leave / incentive leave

## 13. Salary Advance Rules

Suggested policy:
- eligible after `3 months`
- can request only once every `4 months`
- only if trust score above threshold
- only if no major penalty in recent period
- manager approval required

Admin should see:
- eligible / not eligible
- cooldown window
- request history
- approval notes

## 14. Training and Growth

Training should include:
- SOP adherence
- handling anxious pets
- hygiene and sanitation
- customer communication
- punctuality and professionalism
- character building
- personal finance management
- savings and planning

Gamify training with:
- badges
- certificates
- bonus XP
- promotion readiness score

## 15. Blue-Collar Workforce Features

The app and admin should also support:
- attendance
- shift acknowledgement
- emergency incident reporting
- equipment / uniform issue tracking
- payout history
- incentives ledger
- penalties ledger
- referral history
- manager notes
- emergency contact

## 16. Admin Controls

Admin must be able to:
- configure point rules
- configure reward milestones
- configure penalty rules
- manually add/remove points
- manually approve rewards
- manually override penalties
- approve leave
- approve salary advance
- approve promotion / rank changes
- configure training tracks
- view workforce leaderboards
- view performance history
- view incident and complaint history

## 17. Anti-Gaming Controls

Need safeguards against misuse:
- review must be verified
- proof uploads linked to booking + step
- timestamp and actor logging
- location/time consistency checks where possible
- manager approval for exceptional overrides
- suspicious behavior flags

## 18. Data Model Modules To Add

Likely backend entities:
- `TeamMember`
- `TeamMembershipHistory`
- `GroomerRank`
- `GroomerPointsLedger`
- `GroomerReward`
- `GroomerPenalty`
- `LeaveRequest`
- `SalaryAdvanceRequest`
- `TrainingModule`
- `TrainingCompletion`
- `ReferralRecord`
- `AttendanceLog`
- `WorkforcePolicyConfig`

## 19. Build Phases

### Phase 1
- team member model
- admin team-member management
- restricted groomer login
- groomer job list
- SOP execution in app

### Phase 2
- points ledger
- ranks
- basic rewards
- punctuality and review scoring

### Phase 3
- leave requests
- salary advance requests
- referral system
- training modules

### Phase 4
- salary hike logic
- major reward milestones
- leaderboard
- promotion readiness

## 20. Immediate Next Build Slice

Recommended next slice:
- add `TeamMember` model
- extend admin `Teams` page into real team-member roster management
- create workforce admin pages:
  - `Workforce`
  - `Rewards`
  - `Leave`
- then build restricted groomer auth + assigned-jobs app/backend

This keeps the admin visible/control side ready before the Android app starts depending on it.
