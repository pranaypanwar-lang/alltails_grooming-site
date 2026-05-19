import { NextResponse } from "next/server";
import { assertAdminSession } from "../../../_lib/assertAdmin";
import { adminPrisma, logAdminBookingEvent } from "../../../_lib/bookingAdmin";
import {
  getWhatsAppProviderDiagnostics,
  processQueuedCustomerMessages,
} from "../../../../../../lib/customerMessaging/provider";

export const runtime = "nodejs";

const CHANNELS = new Set(["whatsapp", "sms"]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const { id: customerId } = await params;
    const body = await request.json().catch(() => ({}));
    const channel = typeof body.channel === "string" ? body.channel.trim().toLowerCase() : "whatsapp";
    const content = typeof body.content === "string" ? body.content.trim() : "";

    if (!CHANNELS.has(channel)) {
      return NextResponse.json({ error: "Invalid message channel" }, { status: 400 });
    }
    if (!content) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    const booking = await adminPrisma.booking.findFirst({
      where: { userId: customerId },
      orderBy: { createdAt: "desc" },
      include: { user: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "Customer has no booking to attach this message to" }, { status: 404 });
    }

    const message = await adminPrisma.bookingCustomerMessage.create({
      data: {
        bookingId: booking.id,
        channel,
        messageType: "admin_custom",
        language: "en_hi",
        status: "queued",
        recipient: booking.user.phone,
        content,
      },
    });

    await logAdminBookingEvent({
      bookingId: booking.id,
      type: "customer_message_prepared",
      summary: "Custom admin message queued for customer",
      metadata: {
        channel,
        messageType: message.messageType,
        messageId: message.id,
        customerId,
      },
    });

    const diagnostics = getWhatsAppProviderDiagnostics();
    let dispatchResult: Awaited<ReturnType<typeof processQueuedCustomerMessages>> | null = null;
    if (channel === "whatsapp" && diagnostics.configured && diagnostics.provider === "meta_cloud_api") {
      dispatchResult = await processQueuedCustomerMessages(adminPrisma, {
        limit: 1,
        messageIds: [message.id],
      });

      for (const entry of dispatchResult.results) {
        await logAdminBookingEvent({
          bookingId: entry.bookingId,
          type: entry.sentToProvider ? "customer_message_dispatched" : "customer_message_failed",
          summary: entry.sentToProvider
            ? "Custom customer message handed to WhatsApp provider"
            : "Custom customer message failed before provider handoff",
          metadata: {
            messageId: entry.messageId,
            provider: dispatchResult.provider,
            providerRef: entry.providerRef,
            error: entry.error,
          },
        });
      }
    }

    const latestMessage = await adminPrisma.bookingCustomerMessage.findUnique({
      where: { id: message.id },
    });
    const resolvedMessage = latestMessage ?? message;

    return NextResponse.json({
      success: true,
      diagnostics,
      dispatchResult,
      message: {
        id: resolvedMessage.id,
        bookingId: resolvedMessage.bookingId,
        messageType: resolvedMessage.messageType,
        channel: resolvedMessage.channel,
        status: resolvedMessage.status,
        recipient: resolvedMessage.recipient,
        preparedAt: resolvedMessage.preparedAt.toISOString(),
        sentAt: resolvedMessage.sentAt?.toISOString() ?? null,
        content: resolvedMessage.content,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to queue customer message" },
      { status: 500 }
    );
  }
}
