# All Tails Developer Handover

This project is close to launch-ready. The main product areas already built are:

- customer website and booking flow
- admin panel for bookings, dispatch, slots, teams, QA, support, messages, campaigns, and workforce
- groomer login, dashboard, job flow, SOP capture, rewards/progression
- Telegram ops workflow
- WhatsApp lifecycle messaging via Commbirds
- file uploads via Supabase Storage

## Deployment Notes

### 1. Environment variables

Use the provided `.env` only as a handoff reference. Production values should be set in the hosting platform directly.

Important production envs include:

- `DATABASE_URL`
- `NEXT_PUBLIC_APP_URL`
- `CRON_SECRET`
- `ADMIN_SESSION_SECRET`
- `GROOMER_SESSION_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`
- `TELEGRAM_BOT_TOKEN`
- `ADMIN_TELEGRAM_CHAT_ID`
- `WHATSAPP_PROVIDER`
- `WHATSAPP_COMBIRDS_API_URL`
- `WHATSAPP_COMBIRDS_API_KEY`
- `WHATSAPP_COMBIRDS_USERNAME`
- `STORAGE_PROVIDER`
- `SUPABASE_URL`
- `SUPABASE_STORAGE_BUCKET`
- `SUPABASE_STORAGE_REGION`
- `SUPABASE_STORAGE_S3_ENDPOINT`
- `SUPABASE_STORAGE_ACCESS_KEY_ID`
- `SUPABASE_STORAGE_SECRET_ACCESS_KEY`

### 2. Existing domain

Set `NEXT_PUBLIC_APP_URL` to the final live domain exactly.

This affects:

- payment links
- groomer links
- customer links
- admin-generated links

### 3. Storage

Uploads are now configured to use **Supabase Storage**.

Current assumptions:

- `STORAGE_PROVIDER=supabase`
- bucket name: `alltails-assets`
- bucket is public

This was verified locally by successfully uploading a companion avatar and receiving a valid public Supabase URL.

### 4. WhatsApp

WhatsApp provider is **Commbirds**.

Current lifecycle messages wired in code:

- booking confirmation
- booking cancelled confirmation
- booking rescheduled confirmation
- night-before reminder
- groomer delay update
- post-groom care
- review request
- rebooking reminder
- payment retry reminder
- team on the way

Important mapping note:

- internal message type `team_on_the_way` maps to Commbirds campaign `team_on_the_way1`

### 5. Telegram

Telegram is active for ops/team workflows.

Required:

- bot token valid
- admin escalation chat ID valid
- team chat IDs remain correct in the database
- bot still added to team groups after deployment

### 6. Cron jobs

These routes need production scheduling:

- `/api/admin/cron/customer-message-queue`
- `/api/admin/cron/night-before-customer-reminders`
- `/api/admin/cron/fifth-week-rebooking-reminders`
- `/api/admin/cron/groomer-ops-reminders`
- `/api/admin/cron/nightly-dispatch-digest`
- `/api/admin/cron/support-case-signals`

These expect `CRON_SECRET`.

### 7. Database / Prisma

Before starting the app in a fresh environment:

```bash
npm install
npx prisma generate
npm run build
```

If schema drift is suspected, validate the production database state before traffic.

### 8. Auth

Admin auth:

- cookie/session based
- uses `ADMIN_SESSION_SECRET`

Groomer auth:

- cookie/session based
- uses `GROOMER_SESSION_SECRET`

Keep both secrets strong and different.

### 9. Payment

Razorpay is wired and should be rechecked on the live domain for:

- fresh booking payment
- retry payment
- booking confirmation after payment

### 10. Known non-blocking note

Next.js currently shows a warning that the `middleware` convention is deprecated in favor of `proxy`.

This is not currently blocking the build or launch, but should be cleaned up later.

## Live QA Checklist

Please recheck these on the deployed domain:

- customer booking flow
- payment flow
- post-payment address capture
- My Bookings
- cancel/reschedule
- admin bookings and dispatch
- admin messages and support
- Telegram alerts
- WhatsApp queue processing
- groomer login and job flow
- companion avatar upload

## Security Note

Several secrets were exposed during setup/testing and should be rotated before actual production launch, including:

- `TELEGRAM_BOT_TOKEN`
- `WHATSAPP_COMBIRDS_API_KEY`
- `SUPABASE_STORAGE_ACCESS_KEY_ID`
- `SUPABASE_STORAGE_SECRET_ACCESS_KEY`
- `ADMIN_SESSION_SECRET`
- `GROOMER_SESSION_SECRET`
- `RAZORPAY_KEY_SECRET`

## Operational Note

Please avoid casually renaming:

- customer message types
- Commbirds campaign names
- storage paths
- Telegram-related team config

because multiple automated flows depend on those names staying aligned.
