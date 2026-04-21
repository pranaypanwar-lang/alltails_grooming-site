import { NextResponse } from "next/server";
import { adminPrisma, getPublicAppUrl, logAdminBookingEvent } from "../../_lib/bookingAdmin";
import { getGroomerJobUrl } from "../../../../../lib/groomerAccess";
import { sendAdminTelegramMessage, sendTelegramMessage } from "../../../../../lib/telegram/send";
import { createAutomatedSupportCase } from "../../../../../lib/supportCases/service";
import { queueGroomerDelayUpdateMessage } from "../../../../../lib/customerMessaging/automation";

export const runtime = "nodejs";

function formatTime(value: Date) {
  return value.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function minutesUntil(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / 60000);
}

function buildUpcomingReminderMessage(input: {
  serviceName: string;
  slotLabel: string;
  customerName: string;
  petSummary: string;
  actionUrl: string | null;
}) {
  return [
    `⏰ *Upcoming Grooming in 60 Minutes*`,
    "",
    `*Service:* ${input.serviceName}`,
    `*Time:* ${input.slotLabel}`,
    `*Pet parent:* ${input.customerName}`,
    `*Pets:* ${input.petSummary}`,
    ...(input.actionUrl ? ["", `*Open job flow:* ${input.actionUrl}`] : []),
    "",
    `Please mark *En Route* before leaving and keep SOP updates live.`,
    `Kripya nikalne se pehle *En Route* mark karein aur SOP updates live rakhein.`,
  ].join("\n");
}

function buildEscalationMessage(input: {
  serviceName: string;
  slotLabel: string;
  customerName: string;
  customerPhone: string;
  teamName: string;
  opsLeadName: string | null;
  opsLeadPhone: string | null;
  actionUrl: string | null;
}) {
  return [
    `🚨 *Groomer Delay Escalation*`,
    "",
    `*Service:* ${input.serviceName}`,
    `*Slot:* ${input.slotLabel}`,
    `*Pet parent:* ${input.customerName}`,
    `*Customer phone:* ${input.customerPhone}`,
    `*Team:* ${input.teamName}`,
    `*Team contact:* ${input.opsLeadName ?? "Not set"}${input.opsLeadPhone ? ` · ${input.opsLeadPhone}` : ""}`,
    ...(input.actionUrl ? ["", `*Open job flow:* ${input.actionUrl}`] : []),
    "",
    `The team is still not marked en route and this booking is within 25 minutes.`,
    `Yeh booking 25 minute ke andar hai aur team ne abhi tak en route mark nahi kiya hai.`,
  ].join("\n");
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const today = getTodayDate();
    const baseUrl = getPublicAppUrl(request);

    const bookings = await adminPrisma.booking.findMany({
      where: {
        selectedDate: today,
        status: "confirmed",
        assignedTeamId: { not: null },
      },
      include: {
        user: true,
        assignedTeam: true,
        service: true,
        pets: { include: { pet: true } },
        slots: { include: { slot: true }, orderBy: { slot: { startTime: "asc" } } },
      },
      orderBy: { createdAt: "asc" },
    });

    const upcomingResults: Array<{ bookingId: string; reminded: boolean; skippedReason?: string }> = [];
    const escalationResults: Array<{ bookingId: string; escalated: boolean; customerQueued?: boolean; skippedReason?: string }> = [];

    for (const booking of bookings) {
      const team = booking.assignedTeam;
      const firstSlot = booking.slots[0]?.slot ?? null;
      const lastSlot = booking.slots[booking.slots.length - 1]?.slot ?? null;
      if (!team || !firstSlot || !lastSlot) continue;

      const minutesToStart = minutesUntil(now, firstSlot.startTime);
      const slotLabel = `${formatTime(firstSlot.startTime)} – ${formatTime(lastSlot.endTime)}`;
      const petSummary = booking.pets.map((bp) => `${bp.pet.name ?? "Unnamed"} (${bp.pet.breed})`).join(", ");
      const actionUrl = getGroomerJobUrl({
        bookingId: booking.id,
        phone: booking.user.phone,
        baseUrl,
      });

      if (minutesToStart >= 55 && minutesToStart <= 65 && booking.dispatchState === "assigned") {
        const existingReminder = await adminPrisma.dispatchAlert.findFirst({
          where: {
            bookingId: booking.id,
            alertType: "groomer_upcoming_reminder",
            sentAt: { gte: new Date(now.getTime() - 45 * 60 * 1000) },
          },
        });

        if (existingReminder) {
          upcomingResults.push({ bookingId: booking.id, reminded: false, skippedReason: "already_reminded" });
        } else if (!team.telegramChatId || !team.telegramAlertsEnabled) {
          upcomingResults.push({ bookingId: booking.id, reminded: false, skippedReason: "telegram_not_configured" });
        } else {
          let success = false;
          let telegramMessageId: string | null = null;
          let errorMsg: string | undefined;
          try {
            telegramMessageId = await sendTelegramMessage(
              team.telegramChatId,
              buildUpcomingReminderMessage({
                serviceName: booking.service.name,
                slotLabel,
                customerName: booking.user.name,
                petSummary,
                actionUrl,
              })
            );
            success = true;
          } catch (error) {
            errorMsg = error instanceof Error ? error.message : "Telegram send failed";
          }

          await adminPrisma.dispatchAlert.create({
            data: {
              bookingId: booking.id,
              teamId: team.id,
              alertType: "groomer_upcoming_reminder",
              telegramMessageId,
              success,
              errorMsg,
            },
          });

          if (success) {
            await logAdminBookingEvent({
              bookingId: booking.id,
              type: "dispatch_alert_sent",
              summary: "60-minute groomer reminder sent",
              metadata: {
                teamId: team.id,
                alertType: "groomer_upcoming_reminder",
              },
            });
          }

          upcomingResults.push({ bookingId: booking.id, reminded: success, ...(errorMsg ? { skippedReason: errorMsg } : {}) });
        }
      }

      if (minutesToStart >= 20 && minutesToStart <= 30 && booking.dispatchState === "assigned") {
        const existingEscalation = await adminPrisma.bookingSupportCase.findFirst({
          where: {
            bookingId: booking.id,
            category: "groomer_delay",
            source: "system",
            status: { in: ["open", "in_progress"] },
          },
        });

        const supportCase = existingEscalation
          ? { created: false as const, case: existingEscalation }
          : await createAutomatedSupportCase(adminPrisma, {
              bookingId: booking.id,
              category: "groomer_delay",
              priority: "urgent",
              summary: "25-minute pre-slot delay escalation",
              details: "The team is still not marked en route and the booking is within 25 minutes of the slot start.",
            });

        const customerMessage = await queueGroomerDelayUpdateMessage(adminPrisma, booking.id);
        if (customerMessage.created) {
          await logAdminBookingEvent({
            bookingId: booking.id,
            type: "customer_message_prepared",
            summary: "Groomer delay update queued for customer",
            metadata: {
              messageType: "groomer_delay_update",
              status: customerMessage.message.status,
            },
          });
        }

        const adminTelegram = await sendAdminTelegramMessage(
          buildEscalationMessage({
            serviceName: booking.service.name,
            slotLabel,
            customerName: booking.user.name,
            customerPhone: booking.user.phone,
            teamName: team.name,
            opsLeadName: team.opsLeadName ?? null,
            opsLeadPhone: team.opsLeadPhone ?? null,
            actionUrl,
          })
        ).catch((error: unknown) => ({
          sent: false as const,
          telegramMessageId: null,
          reason: error instanceof Error ? error.message : "Admin Telegram send failed",
        }));

        await logAdminBookingEvent({
          bookingId: booking.id,
          type: "support_case_opened",
          summary: supportCase.created
            ? "25-minute pre-slot delay escalation opened automatically"
            : "25-minute pre-slot delay escalation rechecked",
          metadata: {
            category: "groomer_delay",
            adminTelegramSent: adminTelegram.sent,
            adminTelegramReason: "reason" in adminTelegram ? adminTelegram.reason : null,
            teamId: team.id,
            teamContact: team.opsLeadPhone ?? null,
          },
        });

        escalationResults.push({
          bookingId: booking.id,
          escalated: true,
          customerQueued: customerMessage.created,
          ...(supportCase.created ? {} : { skippedReason: "support_case_already_open" }),
        });
      }
    }

    return NextResponse.json({
      date: today,
      upcomingReminderCount: upcomingResults.filter((item) => item.reminded).length,
      escalationCount: escalationResults.filter((item) => item.escalated).length,
      upcomingResults,
      escalationResults,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run groomer ops reminders" },
      { status: 500 }
    );
  }
}
