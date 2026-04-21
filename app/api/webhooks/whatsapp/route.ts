import { NextRequest, NextResponse } from "next/server";
import { adminPrisma, logAdminBookingEvent } from "../../admin/_lib/bookingAdmin";
import {
  handleWhatsAppWebhookStatuses,
  verifyWhatsAppWebhook,
} from "../../../../lib/customerMessaging/provider";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  if (!verifyWhatsAppWebhook({ mode, token, challenge })) {
    return new NextResponse("Verification failed", { status: 403 });
  }

  return new NextResponse(challenge ?? "", { status: 200 });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => ({}));
    const result = await handleWhatsAppWebhookStatuses(adminPrisma, payload);

    for (const entry of result.results) {
      if (!entry.updated || !entry.nextStatus) continue;

      const message = await adminPrisma.bookingCustomerMessage.findFirst({
        where: { providerRef: entry.providerRef },
        select: { bookingId: true, messageType: true },
      });

      if (!message) continue;

      await logAdminBookingEvent({
        bookingId: message.bookingId,
        type: "customer_message_status_updated",
        summary: `WhatsApp provider reported ${entry.nextStatus}`,
        metadata: {
          providerRef: entry.providerRef,
          messageType: message.messageType,
          status: entry.nextStatus,
          source: "webhook",
        },
      });
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process WhatsApp webhook" },
      { status: 500 }
    );
  }
}
