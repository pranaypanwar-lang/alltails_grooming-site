import { NextResponse } from "next/server";
import { adminPrisma, logAdminBookingEvent } from "../../_lib/bookingAdmin";
import {
  getWhatsAppProviderDiagnostics,
  processQueuedCustomerMessages,
} from "../../../../../lib/customerMessaging/provider";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const diagnostics = getWhatsAppProviderDiagnostics();
    const result = await processQueuedCustomerMessages(adminPrisma);

    for (const entry of result.results) {
      await logAdminBookingEvent({
        bookingId: entry.bookingId,
        type: entry.sentToProvider ? "customer_message_dispatched" : "customer_message_failed",
        summary: entry.sentToProvider
          ? "Customer message handed to WhatsApp provider"
          : "Customer message failed before provider handoff",
        metadata: {
          messageId: entry.messageId,
          provider: result.provider,
          providerRef: entry.providerRef,
          error: entry.error,
        },
      });
    }

    return NextResponse.json({
      diagnostics,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process customer message queue" },
      { status: 500 }
    );
  }
}
