import { NextResponse } from "next/server";
import { assertAdminSession } from "../../_lib/assertAdmin";
import { adminPrisma, logAdminBookingEvent } from "../../_lib/bookingAdmin";
import { updateCustomerMessageStatus } from "../../../../../lib/customerMessaging/service";

export const runtime = "nodejs";

const ALLOWED_STATUSES = new Set(["prepared", "queued", "sent", "failed"]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const status = typeof body.status === "string" ? body.status.trim() : "";
    const providerRef = typeof body.providerRef === "string" ? body.providerRef.trim() || null : null;
    const errorMsg = typeof body.errorMsg === "string" ? body.errorMsg.trim() || null : null;

    if (!ALLOWED_STATUSES.has(status)) {
      return NextResponse.json({ error: "Invalid customer message status" }, { status: 400 });
    }

    const updated = await updateCustomerMessageStatus(adminPrisma, id, {
      status: status as "prepared" | "queued" | "sent" | "failed",
      providerRef,
      errorMsg,
    });

    await logAdminBookingEvent({
      bookingId: updated.bookingId,
      type: "customer_message_status_updated",
      summary: `Customer message moved to ${updated.status.replace(/_/g, " ")}`,
      metadata: {
        messageId: updated.id,
        messageType: updated.messageType,
        status: updated.status,
        providerRef: updated.providerRef ?? null,
        errorMsg: updated.errorMsg ?? null,
      },
    });

    return NextResponse.json({
      success: true,
      message: {
        id: updated.id,
        bookingId: updated.bookingId,
        channel: updated.channel,
        messageType: updated.messageType,
        language: updated.language,
        status: updated.status,
        recipient: updated.recipient,
        content: updated.content,
        actionUrl: updated.actionUrl,
        error: updated.errorMsg,
        providerRef: updated.providerRef,
        preparedAt: updated.preparedAt.toISOString(),
        sentAt: updated.sentAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    if (error instanceof Error && "httpStatus" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as Error & { httpStatus: number }).httpStatus }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update customer message" },
      { status: 500 }
    );
  }
}
