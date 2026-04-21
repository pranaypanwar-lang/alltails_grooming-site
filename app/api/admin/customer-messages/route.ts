import { NextRequest, NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../lib/generated/prisma";
import { assertAdminSession } from "../_lib/assertAdmin";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

export async function GET(request: NextRequest) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const q = request.nextUrl.searchParams;
    const search = q.get("search")?.trim() ?? "";
    const messageType = q.get("messageType")?.trim() ?? "";
    const status = q.get("status")?.trim() ?? "";
    const selectedDate = q.get("date")?.trim() ?? "";

    const messages = await prisma.bookingCustomerMessage.findMany({
      where: {
        ...(messageType ? { messageType } : {}),
        ...(status ? { status } : {}),
        booking: {
          ...(selectedDate ? { selectedDate } : {}),
          ...(search
            ? {
                OR: [
                  { id: { contains: search, mode: "insensitive" } },
                  { user: { name: { contains: search, mode: "insensitive" } } },
                  { user: { phone: { contains: search } } },
                  { service: { name: { contains: search, mode: "insensitive" } } },
                ],
              }
            : {}),
        },
      },
      include: {
        booking: {
          include: {
            user: true,
            service: true,
          },
        },
      },
      orderBy: { preparedAt: "desc" },
      take: 250,
    });

    const rows = messages.map((message) => ({
      id: message.id,
      bookingId: message.bookingId,
      selectedDate: message.booking.selectedDate ?? null,
      customerName: message.booking.user.name,
      customerPhone: message.booking.user.phone,
      serviceName: message.booking.service.name,
      city: message.booking.user.city ?? null,
      messageType: message.messageType,
      channel: message.channel,
      language: message.language,
      status: message.status,
      recipient: message.recipient,
      content: message.content,
      actionUrl: message.actionUrl ?? null,
      error: message.errorMsg ?? null,
      providerRef: message.providerRef ?? null,
      preparedAt: message.preparedAt.toISOString(),
      sentAt: message.sentAt?.toISOString() ?? null,
    }));

    return NextResponse.json({
      summary: {
        totalMessages: rows.length,
        bookingConfirmationCount: rows.filter((row) => row.messageType === "booking_confirmation").length,
        reminderCount: rows.filter((row) => row.messageType === "night_before_reminder").length,
        careGuideCount: rows.filter((row) => row.messageType === "post_groom_care").length,
        reviewRequestCount: rows.filter((row) => row.messageType === "review_request").length,
        rebookingReminderCount: rows.filter((row) => row.messageType === "rebooking_reminder").length,
        careTipCount: rows.filter((row) => row.messageType === "periodic_care_tip").length,
        customOfferCount: rows.filter((row) => row.messageType === "custom_offer").length,
        queuedCount: rows.filter((row) => row.status === "queued").length,
        sentCount: rows.filter((row) => row.status === "sent").length,
        failedCount: rows.filter((row) => row.status === "failed").length,
      },
      messages: rows,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load customer messages" },
      { status: 500 }
    );
  }
}
