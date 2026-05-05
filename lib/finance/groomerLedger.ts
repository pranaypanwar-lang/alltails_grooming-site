import type { Prisma, PrismaClient } from "../generated/prisma";

type DbClient = PrismaClient | Prisma.TransactionClient;

const IST_OFFSET_MINUTES = 330;

export function getIstMonthBucket(date = new Date()) {
  const istTime = new Date(date.getTime() + IST_OFFSET_MINUTES * 60_000);
  return istTime.toISOString().slice(0, 7);
}

export async function syncCashCollectionLedgerForBooking(
  tx: Prisma.TransactionClient,
  bookingId: string
) {
  const booking = await tx.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      status: true,
      finalAmount: true,
      groomerMemberId: true,
      paymentCollection: {
        select: {
          id: true,
          collectionMode: true,
          collectedAmount: true,
          expectedAmount: true,
          mismatchFlag: true,
          recordedAt: true,
          recordedBy: true,
        },
      },
    },
  });

  if (!booking?.paymentCollection) return null;

  const source = {
    sourceType: "BookingPaymentCollection",
    sourceId: booking.paymentCollection.id,
    type: "cash_collected",
  };

  const shouldHoldCash =
    booking.status === "completed" &&
    !!booking.groomerMemberId &&
    booking.paymentCollection.collectionMode === "cash" &&
    booking.paymentCollection.collectedAmount > 0;

  if (!shouldHoldCash) {
    await tx.groomerLedgerEntry.deleteMany({
      where: source,
    });
    return null;
  }

  return tx.groomerLedgerEntry.upsert({
    where: {
      sourceType_sourceId_type: source,
    },
    create: {
      groomerMemberId: booking.groomerMemberId!,
      monthBucket: getIstMonthBucket(booking.paymentCollection.recordedAt),
      direction: "debit",
      amount: booking.paymentCollection.collectedAmount,
      ...source,
      description: `Cash collected for booking ${booking.id}`,
      createdBy: booking.paymentCollection.recordedBy ?? "system",
      occurredAt: booking.paymentCollection.recordedAt,
      metadataJson: JSON.stringify({
        bookingId: booking.id,
        finalAmount: booking.finalAmount,
        expectedAmount: booking.paymentCollection.expectedAmount,
        mismatchFlag: booking.paymentCollection.mismatchFlag,
      }),
    },
    update: {
      groomerMemberId: booking.groomerMemberId!,
      monthBucket: getIstMonthBucket(booking.paymentCollection.recordedAt),
      direction: "debit",
      amount: booking.paymentCollection.collectedAmount,
      description: `Cash collected for booking ${booking.id}`,
      createdBy: booking.paymentCollection.recordedBy ?? "system",
      occurredAt: booking.paymentCollection.recordedAt,
      metadataJson: JSON.stringify({
        bookingId: booking.id,
        finalAmount: booking.finalAmount,
        expectedAmount: booking.paymentCollection.expectedAmount,
        mismatchFlag: booking.paymentCollection.mismatchFlag,
      }),
    },
  });
}

export async function createCashDepositLedgerEntry(
  tx: Prisma.TransactionClient,
  input: {
    cashDepositId: string;
    groomerMemberId: string;
    amount: number;
    depositedAt: Date;
    depositMode: string;
    referenceId?: string | null;
    recordedBy?: string | null;
  }
) {
  return tx.groomerLedgerEntry.create({
    data: {
      groomerMemberId: input.groomerMemberId,
      monthBucket: getIstMonthBucket(input.depositedAt),
      type: "cash_deposited",
      direction: "credit",
      amount: input.amount,
      sourceType: "GroomerCashDeposit",
      sourceId: input.cashDepositId,
      description: `Cash deposit recorded via ${input.depositMode}`,
      createdBy: input.recordedBy ?? "admin",
      occurredAt: input.depositedAt,
      metadataJson: JSON.stringify({
        depositMode: input.depositMode,
        referenceId: input.referenceId ?? null,
      }),
    },
  });
}

export async function syncApprovedExpenseLedgerEntry(
  tx: Prisma.TransactionClient,
  expenseId: string
) {
  const expense = await tx.groomerExpense.findUnique({
    where: { id: expenseId },
    select: {
      id: true,
      groomerMemberId: true,
      category: true,
      amount: true,
      status: true,
      reviewedAt: true,
      reviewedBy: true,
      bookingId: true,
    },
  });

  if (!expense) return null;

  const source = {
    sourceType: "GroomerExpense",
    sourceId: expense.id,
    type: "reimbursement_other",
  };

  if (expense.status !== "approved") {
    await tx.groomerLedgerEntry.deleteMany({ where: source });
    return null;
  }

  const occurredAt = expense.reviewedAt ?? new Date();

  return tx.groomerLedgerEntry.upsert({
    where: {
      sourceType_sourceId_type: source,
    },
    create: {
      groomerMemberId: expense.groomerMemberId,
      monthBucket: getIstMonthBucket(occurredAt),
      direction: "credit",
      amount: expense.amount,
      ...source,
      description: `Approved ${expense.category.replace(/_/g, " ")} reimbursement`,
      createdBy: expense.reviewedBy ?? "admin",
      occurredAt,
      metadataJson: JSON.stringify({
        expenseId: expense.id,
        category: expense.category,
        bookingId: expense.bookingId,
      }),
    },
    update: {
      groomerMemberId: expense.groomerMemberId,
      monthBucket: getIstMonthBucket(occurredAt),
      direction: "credit",
      amount: expense.amount,
      description: `Approved ${expense.category.replace(/_/g, " ")} reimbursement`,
      createdBy: expense.reviewedBy ?? "admin",
      occurredAt,
      metadataJson: JSON.stringify({
        expenseId: expense.id,
        category: expense.category,
        bookingId: expense.bookingId,
      }),
    },
  });
}

export function calculateCashHeld(entries: Array<{ direction: string; amount: number }>) {
  return entries.reduce((sum, entry) => {
    if (entry.direction === "debit") return sum + entry.amount;
    if (entry.direction === "credit") return sum - entry.amount;
    return sum;
  }, 0);
}

export async function getGroomerCashHeld(prisma: DbClient, groomerMemberId: string) {
  const entries = await prisma.groomerLedgerEntry.findMany({
    where: {
      groomerMemberId,
      type: { in: ["cash_collected", "cash_deposited"] },
    },
    select: {
      direction: true,
      amount: true,
    },
  });

  return calculateCashHeld(entries);
}
