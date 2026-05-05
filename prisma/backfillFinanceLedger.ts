import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma";
import { syncEstimatedFuelTripForBooking } from "../lib/finance/fuelTrips";
import { syncCashCollectionLedgerForBooking } from "../lib/finance/groomerLedger";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const completedBookings = await prisma.booking.findMany({
    where: { status: "completed" },
    select: {
      id: true,
      groomerMemberId: true,
      finalAmount: true,
      paymentMethod: true,
      paymentStatus: true,
      paymentCollection: {
        select: {
          collectionMode: true,
          collectedAmount: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const summary = {
    completedBookings: completedBookings.length,
    assignedCompletedBookings: 0,
    cashCollectionBookings: 0,
    onlineCollectionBookings: 0,
    prepaidPaidBookings: 0,
    cashCollectedAmount: 0,
    onlineCollectedAmount: 0,
    prepaidPaidAmount: 0,
    cashLedgerSynced: 0,
    fuelTripsSynced: 0,
    skippedNoGroomer: 0,
  };

  for (const booking of completedBookings) {
    if (booking.groomerMemberId) summary.assignedCompletedBookings += 1;
    else summary.skippedNoGroomer += 1;

    if (booking.paymentCollection?.collectionMode === "cash") {
      summary.cashCollectionBookings += 1;
      summary.cashCollectedAmount += booking.paymentCollection.collectedAmount;
    } else if (booking.paymentCollection?.collectionMode === "online") {
      summary.onlineCollectionBookings += 1;
      summary.onlineCollectedAmount += booking.paymentCollection.collectedAmount;
    } else if (booking.paymentMethod === "pay_now" && booking.paymentStatus === "paid") {
      summary.prepaidPaidBookings += 1;
      summary.prepaidPaidAmount += booking.finalAmount;
    }

    await prisma.$transaction(async (tx) => {
      const cashEntry = await syncCashCollectionLedgerForBooking(tx, booking.id);
      const fuelTrip = await syncEstimatedFuelTripForBooking(tx, booking.id);
      if (cashEntry) summary.cashLedgerSynced += 1;
      if (fuelTrip) summary.fuelTripsSynced += 1;
    });
  }

  console.log("Finance ledger backfill complete");
  console.table(summary);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Finance ledger backfill failed", error);
  process.exit(1);
});
