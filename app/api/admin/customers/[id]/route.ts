import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../_lib/assertAdmin";
import {
  buildCustomerTimeline,
  buildLifecycleMetrics,
  getBookingWindowLabel,
  getDerivedBookingStatus,
  getDerivedBookingStatusLabel,
  getDerivedPaymentStatus,
  getDerivedPaymentStatusLabel,
  inferPetSpecies,
  getLatestSavedAddress,
  getPaymentMethodLabel,
  maskPhone,
} from "../../../../../lib/admin/customers";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        pets: {
          include: {
            assets: {
              select: {
                kind: true,
                publicUrl: true,
              },
            },
          },
        },
        bookings: {
          include: {
            service: true,
            assignedTeam: { select: { id: true, name: true } },
            groomerMember: { select: { id: true, name: true, role: true, currentRank: true } },
            slots: {
              include: {
                slot: {
                  include: {
                    team: { select: { id: true, name: true } },
                  },
                },
              },
            },
            events: {
              select: {
                type: true,
                summary: true,
                createdAt: true,
              },
              orderBy: { createdAt: "asc" },
            },
            customerMessages: {
              select: {
                id: true,
                messageType: true,
                channel: true,
                status: true,
                recipient: true,
                preparedAt: true,
                sentAt: true,
                content: true,
              },
              orderBy: { preparedAt: "desc" },
            },
            supportCases: {
              select: {
                id: true,
                category: true,
                status: true,
                priority: true,
                summary: true,
                resolution: true,
                openedAt: true,
                resolvedAt: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const extraSupportCases = await prisma.bookingSupportCase.findMany({
      where: {
        OR: [
          { booking: { userId: user.id } },
          { customerPhone: user.phone },
        ],
      },
      orderBy: { openedAt: "desc" },
    });

    const messages = user.bookings.flatMap((booking) =>
      booking.customerMessages.map((message) => ({
        ...message,
        bookingId: booking.id,
      }))
    );
    const supportCases = extraSupportCases.map((supportCase) => ({
      id: supportCase.id,
      bookingId: supportCase.bookingId,
      category: supportCase.category,
      status: supportCase.status,
      priority: supportCase.priority,
      summary: supportCase.summary,
      resolution: supportCase.resolution,
      openedAt: supportCase.openedAt,
      resolvedAt: supportCase.resolvedAt,
    }));

    const metrics = buildLifecycleMetrics({
      bookings: user.bookings,
      pets: user.pets,
      supportCases,
      messages,
      loyaltyFreeUnlocked: user.loyaltyFreeUnlocked,
    });
    const latestAddress = getLatestSavedAddress(user.bookings);
    const timeline = buildCustomerTimeline({
      bookings: user.bookings,
      messages,
      supportCases,
    });

    const bookingHistory = user.bookings.map((booking) => {
      const derivedStatus = getDerivedBookingStatus(booking);
      const derivedPaymentStatus = getDerivedPaymentStatus(booking);
      return {
        id: booking.id,
        status: derivedStatus,
        statusLabel: getDerivedBookingStatusLabel(derivedStatus),
        paymentStatus: derivedPaymentStatus,
        paymentStatusLabel: getDerivedPaymentStatusLabel(derivedPaymentStatus),
        paymentMethod: booking.paymentMethod as "pay_now" | "pay_after_service" | "cash" | null,
        paymentMethodLabel: getPaymentMethodLabel(booking.paymentMethod),
        serviceName: booking.service.name,
        selectedDate: booking.selectedDate ?? null,
        createdAt: booking.createdAt.toISOString(),
        completedAt:
          booking.events.find((event) => event.type === "booking_completed")?.createdAt.toISOString() ??
          booking.loyaltyCountedAt?.toISOString() ??
          (booking.status === "completed" ? booking.updatedAt.toISOString() : null),
        bookingWindowLabel: getBookingWindowLabel(booking),
        finalAmount: booking.finalAmount,
        originalAmount: booking.originalAmount,
        refundAmount: booking.refundAmount ?? null,
        couponCode: booking.couponCode ?? null,
        team: booking.assignedTeam ? { id: booking.assignedTeam.id, name: booking.assignedTeam.name } : null,
        groomerMember: booking.groomerMember
          ? {
              id: booking.groomerMember.id,
              name: booking.groomerMember.name,
              role: booking.groomerMember.role,
              currentRank: booking.groomerMember.currentRank,
            }
          : null,
        dispatchState: (booking.dispatchState ?? "unassigned") as
          | "unassigned"
          | "assigned"
          | "en_route"
          | "started"
          | "completed"
          | "issue",
        loyaltyRewardApplied: booking.loyaltyRewardApplied,
      };
    });

    return NextResponse.json({
      customer: {
        customer: {
          id: user.id,
          name: user.name,
          phoneFull: user.phone,
          phoneMasked: maskPhone(user.phone),
          city: user.city ?? null,
          createdAt: user.createdAt.toISOString(),
          lifecycleStage: metrics.stage,
          lifecycleLabel: metrics.label,
          lifecycleReason: metrics.reason,
          riskFlags: metrics.riskFlags,
        },
        overview: {
          totalBookings: metrics.totalBookings,
          completedBookings: metrics.completedBookings,
          upcomingConfirmedBookings: metrics.upcomingConfirmedBookings,
          cancelledOrExpiredBookings: metrics.cancelledOrExpiredBookings,
          totalSpent: metrics.totalSpent,
          refundedAmount: metrics.refundedAmount,
          netValue: metrics.totalSpent - metrics.refundedAmount,
          averageOrderValue: metrics.averageOrderValue,
          firstBookingAt: metrics.firstBookingAt?.toISOString() ?? null,
          lastCompletedAt: metrics.lastCompletedAt?.toISOString() ?? null,
          nextBookingAt: metrics.nextBookingAt?.toISOString() ?? null,
          expectedNextBookingAt: metrics.expectedNextBookingAt?.toISOString() ?? null,
          expectedCycleDays: metrics.expectedCycleDays,
          daysOverdue: metrics.daysOverdue,
          lastMessageAt: metrics.lastMessageAt?.toISOString() ?? null,
          openCaseCount: metrics.openCaseCount,
        },
        loyalty: {
          completedCount: user.loyaltyCompletedCount,
          freeUnlocked: user.loyaltyFreeUnlocked,
          unlockedAt: user.loyaltyUnlockedAt?.toISOString() ?? null,
          lastRedeemedAt: user.loyaltyLastRedeemedAt?.toISOString() ?? null,
        },
        latestAddress: latestAddress
          ? {
              serviceAddress: latestAddress.serviceAddress,
              serviceLandmark: latestAddress.serviceLandmark,
              servicePincode: latestAddress.servicePincode,
              serviceLocationUrl: latestAddress.serviceLocationUrl,
              addressUpdatedAt: latestAddress.addressUpdatedAt?.toISOString() ?? null,
            }
          : null,
        pets: user.pets.map((pet) => ({
          id: pet.id,
          name: pet.name ?? null,
          breed: pet.breed,
          species: inferPetSpecies(pet.species, pet.breed),
          avatarUrl: pet.assets.find((asset) => asset.kind === "avatar")?.publicUrl ?? pet.avatarUrl ?? null,
          defaultGroomingNotes: pet.defaultGroomingNotes ?? null,
          defaultStylingNotes: pet.defaultStylingNotes ?? null,
          temperament: pet.temperament ?? null,
          lastBookedAt: pet.lastBookedAt?.toISOString() ?? null,
          stylingReferenceUrls: pet.assets
            .filter((asset) => asset.kind === "styling_reference")
            .map((asset) => asset.publicUrl),
        })),
        bookingHistory,
        communications: messages
          .sort((a, b) => {
            const aTime = (a.sentAt ?? a.preparedAt).getTime();
            const bTime = (b.sentAt ?? b.preparedAt).getTime();
            return bTime - aTime;
          })
          .map((message) => ({
            id: message.id,
            bookingId: message.bookingId,
            messageType: message.messageType,
            channel: message.channel,
            status: message.status,
            recipient: message.recipient,
            preparedAt: message.preparedAt.toISOString(),
            sentAt: message.sentAt?.toISOString() ?? null,
            content: message.content,
          })),
        supportCases: supportCases.map((supportCase) => ({
          id: supportCase.id,
          bookingId: supportCase.bookingId,
          category: supportCase.category,
          status: supportCase.status,
          priority: supportCase.priority,
          summary: supportCase.summary,
          resolution: supportCase.resolution,
          openedAt: supportCase.openedAt.toISOString(),
          resolvedAt: supportCase.resolvedAt?.toISOString() ?? null,
        })),
        timeline: timeline.map((item) => ({
          id: item.id,
          kind: item.kind,
          at: item.at.toISOString(),
          title: item.title,
          description: item.description,
          bookingId: item.bookingId,
          tone: item.tone,
        })),
      },
    });
  } catch (error) {
    console.error("GET /api/admin/customers/:id failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load customer details" },
      { status: 500 }
    );
  }
}
