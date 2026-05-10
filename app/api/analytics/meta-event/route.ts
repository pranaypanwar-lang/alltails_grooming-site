import { NextResponse } from "next/server";
import { sendMetaConversionsFunnelEvent } from "../../../../lib/analytics/metaConversionsApi";

export const runtime = "nodejs";

const ALLOWED_EVENTS = new Set([
  "ViewContent",
  "AddToCart",
  "InitiateCheckout",
  "AddPaymentInfo",
]);

type RequestBody = {
  eventName?: string;
  eventId?: string;
  customData?: Record<string, unknown>;
  userData?: {
    phone?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    city?: string | null;
  };
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as RequestBody;

    const { eventName, eventId, customData, userData } = body;

    if (!eventName || typeof eventName !== "string" || !ALLOWED_EVENTS.has(eventName)) {
      return NextResponse.json(
        { error: "Unsupported eventName" },
        { status: 400 }
      );
    }

    if (!eventId || typeof eventId !== "string") {
      return NextResponse.json(
        { error: "eventId is required for deduplication" },
        { status: 400 }
      );
    }

    // Fire-and-forget from the caller's perspective: we still await here so
    // the response includes any Meta error, but we never let CAPI failures
    // surface to the user. Caller treats non-2xx as a soft signal only.
    const result = await sendMetaConversionsFunnelEvent({
      request,
      eventName: eventName as
        | "ViewContent"
        | "AddToCart"
        | "InitiateCheckout"
        | "AddPaymentInfo",
      eventId,
      customData: customData && typeof customData === "object" ? customData : undefined,
      userData: userData && typeof userData === "object" ? userData : undefined,
    });

    return NextResponse.json({ success: true, skipped: "skipped" in result ? result.skipped : false });
  } catch (error) {
    console.error("/api/analytics/meta-event failed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
