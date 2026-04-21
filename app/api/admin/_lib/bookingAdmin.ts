import "dotenv/config";
import Razorpay from "razorpay";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../../../../lib/generated/prisma";
import { BOOKING_SOP_STEPS } from "../../../../lib/booking/sop";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
export const adminPrisma = new PrismaClient({ adapter });

export const adminRazorpay =
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      })
    : null;

export function normalizeDateInput(value: string) {
  return value.trim();
}

export function makeIstDayBounds(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - 330 * 60_000);
  const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) - 330 * 60_000);
  return { startOfDay, endOfDay };
}

export async function logAdminBookingEvent(input: {
  bookingId: string;
  type: string;
  summary: string;
  metadata?: Record<string, unknown>;
}) {
  return adminPrisma.bookingEvent.create({
    data: {
      bookingId: input.bookingId,
      type: input.type,
      actor: "admin",
      summary: input.summary,
      metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });
}

export async function logBookingEvent(input: {
  bookingId: string;
  type: string;
  summary: string;
  actor: string;
  metadata?: Record<string, unknown>;
}) {
  return adminPrisma.bookingEvent.create({
    data: {
      bookingId: input.bookingId,
      type: input.type,
      actor: input.actor,
      summary: input.summary,
      metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });
}

export async function ensureBookingSopSteps(
  tx: Prisma.TransactionClient,
  bookingId: string
) {
  await tx.bookingSopStep.createMany({
    data: BOOKING_SOP_STEPS.map((step) => ({
      bookingId,
      stepKey: step.key,
    })),
    skipDuplicates: true,
  });
}

export function getPublicAppUrl(request: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}`.replace(/\/$/, "");
}
