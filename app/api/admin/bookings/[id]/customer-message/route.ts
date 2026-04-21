import { NextResponse } from "next/server";
import { assertAdminSession } from "../../../_lib/assertAdmin";
import { logAdminBookingEvent } from "../../../_lib/bookingAdmin";
import {
  prepareCustomerMessageForBooking,
} from "../../../../../../lib/customerMessaging/service";
import { adminPrisma } from "../../../_lib/bookingAdmin";
import type { ExtendedCustomerMessageType } from "../../../../../../lib/customerMessaging/templates";

export const runtime = "nodejs";

const ALLOWED_MESSAGE_TYPES = new Set<ExtendedCustomerMessageType>([
  "booking_confirmation",
  "team_on_the_way",
  "night_before_reminder",
  "post_groom_care",
  "review_request",
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const { id: bookingId } = await params;
    const body = await request.json().catch(() => ({}));
    const messageType =
      typeof body.messageType === "string" ? body.messageType.trim() : "";

    if (!ALLOWED_MESSAGE_TYPES.has(messageType as ExtendedCustomerMessageType)) {
      return NextResponse.json({ error: "Invalid message type" }, { status: 400 });
    }

    const result = await prepareCustomerMessageForBooking(
      adminPrisma,
      bookingId,
      messageType as ExtendedCustomerMessageType
    );

    await logAdminBookingEvent({
      bookingId,
      type: "customer_message_prepared",
      summary: `${messageType.replace(/_/g, " ")} prepared for customer`,
      metadata: {
        channel: result.message.channel,
        messageType: result.message.messageType,
        recipient: result.message.recipient,
        addressStatus: result.addressStatus ?? null,
      },
    });

    return NextResponse.json({
      success: true,
      bookingId,
      message: {
        id: result.message.id,
        channel: result.message.channel,
        messageType: result.message.messageType,
        language: result.message.language,
        status: result.message.status,
        recipient: result.message.recipient,
        content: result.message.content,
        actionUrl: result.message.actionUrl,
        preparedAt: result.message.preparedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("POST /api/admin/bookings/:id/customer-message failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to prepare customer message" },
      { status: 500 }
    );
  }
}
