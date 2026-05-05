import crypto from "crypto";
import { buildBookingEventId, buildServiceMeta, META_PIXEL_ID } from "./metaPixel";

type MetaConversionsEventName = "Lead" | "Qualified" | "Purchase";

type MetaConversionsEventInput = {
  request: Request;
  eventName: MetaConversionsEventName;
  bookingId: string;
  qualifiedStage?: "initiated" | "confirmed";
  phone?: string | null;
  externalId?: string | null;
  name?: string | null;
  city?: string | null;
  serviceName: string;
  value: number;
  currency?: string;
  petCount?: number;
  selectedDate?: string | null;
  bookingWindow?: string | null;
  paymentMethod?: string | null;
};

const META_CAPI_ACCESS_TOKEN =
  process.env.META_CAPI_ACCESS_TOKEN?.trim() ||
  process.env.META_CONVERSIONS_API_ACCESS_TOKEN?.trim() ||
  "";

const META_CAPI_TEST_EVENT_CODE =
  process.env.META_CAPI_TEST_EVENT_CODE?.trim() ||
  process.env.META_TEST_EVENT_CODE?.trim() ||
  "";

const META_GRAPH_API_VERSION = "v25.0";

const getPixelId = () =>
  process.env.META_PIXEL_ID?.trim() ||
  process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() ||
  META_PIXEL_ID;

const sha256 = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");

const normalizePhone = (phone?: string | null) => {
  if (!phone) return null;

  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return digits;
};

const getClientIp = (request: Request) => {
  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) return undefined;

  return forwarded.split(",")[0]?.trim() || undefined;
};

const getCookieValue = (cookieHeader: string | null, name: string) => {
  if (!cookieHeader) return undefined;

  const cookies = cookieHeader.split(";").map((part) => part.trim());
  const match = cookies.find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
};

const getEventSourceUrl = (request: Request) => {
  const referer = request.headers.get("referer")?.trim();
  if (referer) return referer;

  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "localhost:3000";

  return `${proto}://${host}`.replace(/\/$/, "");
};

export const isMetaConversionsApiConfigured = () =>
  Boolean(getPixelId() && META_CAPI_ACCESS_TOKEN);

export async function sendMetaConversionsEvent(
  input: MetaConversionsEventInput
) {
  if (!isMetaConversionsApiConfigured()) {
    return { skipped: true as const };
  }

  const normalizedPhone = normalizePhone(input.phone);
  const cookieHeader = input.request.headers.get("cookie");
  const fbp = getCookieValue(cookieHeader, "_fbp");
  const fbc = getCookieValue(cookieHeader, "_fbc");

  // Split name into first/last for better match rate
  const nameParts = input.name?.trim().split(/\s+/) ?? [];
  const firstName = nameParts[0] ?? null;
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

  // Normalize city: lowercase, no spaces (Meta requirement)
  const normalizedCity = input.city?.trim().toLowerCase().replace(/\s+/g, "") ?? null;

  const eventId = buildBookingEventId(
    input.eventName === "Lead"
      ? "lead"
      : input.eventName === "Qualified"
        ? (input.qualifiedStage === "confirmed" ? "qualified_confirmed" : "qualified_initiated")
        : "purchase",
    input.bookingId
  );

  const serviceMeta = buildServiceMeta(input.serviceName, {
    value: input.value,
    currency: input.currency ?? "INR",
    pet_count: input.petCount,
    city: input.city ?? undefined,
    selected_date: input.selectedDate ?? undefined,
    booking_window: input.bookingWindow ?? undefined,
    payment_method: input.paymentMethod ?? undefined,
  });

  const payload = {
    data: [
      {
        event_name: input.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: "website",
        event_source_url: getEventSourceUrl(input.request),
        user_data: {
          client_ip_address: getClientIp(input.request),
          client_user_agent: input.request.headers.get("user-agent") ?? undefined,
          ph: normalizedPhone ? [sha256(normalizedPhone)] : undefined,
          external_id: input.externalId ? [sha256(input.externalId)] : undefined,
          fn: firstName ? [sha256(firstName.toLowerCase())] : undefined,
          ln: lastName ? [sha256(lastName.toLowerCase())] : undefined,
          ct: normalizedCity ? [sha256(normalizedCity)] : undefined,
          country: [sha256("in")],
          fbp,
          fbc,
        },
        custom_data: {
          ...serviceMeta,
          value: input.value,
          currency: input.currency ?? "INR",
          order_id: input.bookingId,
          num_items: input.petCount,
        },
      },
    ],
    test_event_code: META_CAPI_TEST_EVENT_CODE || undefined,
  };

  const requestBody = JSON.stringify({
    ...payload,
    access_token: META_CAPI_ACCESS_TOKEN,
  });

  // Two attempts: original + one retry on transient failure (timeout / 5xx / network).
  // Total max time ~9s so the booking endpoint isn't blocked too long.
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    try {
      const response = await fetch(
        `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${getPixelId()}/events`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestBody,
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          typeof data?.error?.message === "string"
            ? data.error.message
            : `Meta Conversions API request failed (status ${response.status})`;
        // Retry only on 5xx — 4xx is a payload problem and won't fix itself.
        if (response.status >= 500 && attempt === 1) {
          lastError = new Error(message);
          await new Promise((r) => setTimeout(r, 600));
          continue;
        }
        throw new Error(message);
      }

      console.log("[meta-capi]", JSON.stringify({
        eventName: input.eventName,
        eventId,
        bookingId: input.bookingId,
        attempt,
        fbtrace: data?.fbtrace_id ?? null,
        eventsReceived: data?.events_received ?? null,
      }));

      return { skipped: false as const, eventId, response: data };
    } catch (error) {
      clearTimeout(timeout);
      const message = error instanceof Error ? error.message : "Unknown CAPI error";
      // Retry once for AbortError (timeout) or network errors.
      const isTransient =
        (error instanceof Error && error.name === "AbortError") ||
        message.toLowerCase().includes("fetch") ||
        message.toLowerCase().includes("network");
      if (attempt === 1 && isTransient) {
        lastError = error instanceof Error ? error : new Error(message);
        await new Promise((r) => setTimeout(r, 600));
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new Error("Meta Conversions API exhausted retries");
}
