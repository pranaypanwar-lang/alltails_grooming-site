import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../_lib/assertAdmin";
import { calculateCashHeld } from "../../../../../lib/finance/groomerLedger";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

export async function GET() {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const members = await prisma.teamMember.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        baseSalary: true,
        salaryEffectiveFromMonth: true,
        homeAddress: true,
        homeLat: true,
        homeLng: true,
        bikeAverageKmPerLitre: true,
        fuelRatePerLitre: true,
        team: { select: { id: true, name: true } },
        ledgerEntries: {
          where: {
            type: { in: ["cash_collected", "cash_deposited"] },
          },
          orderBy: { occurredAt: "desc" },
          select: {
            id: true,
            monthBucket: true,
            type: true,
            direction: true,
            amount: true,
            sourceType: true,
            sourceId: true,
            description: true,
            occurredAt: true,
            createdBy: true,
          },
        },
        cashDeposits: {
          orderBy: { depositedAt: "desc" },
          take: 5,
          select: {
            id: true,
            amount: true,
            depositMode: true,
            referenceId: true,
            notes: true,
            recordedBy: true,
            depositedAt: true,
          },
        },
      },
    });

    const groomers = members.map((member) => {
      const cashHeld = calculateCashHeld(member.ledgerEntries);
      const cashCollected = member.ledgerEntries
        .filter((entry) => entry.type === "cash_collected")
        .reduce((sum, entry) => sum + entry.amount, 0);
      const cashDeposited = member.ledgerEntries
        .filter((entry) => entry.type === "cash_deposited")
        .reduce((sum, entry) => sum + entry.amount, 0);

      return {
        id: member.id,
        name: member.name,
        phone: member.phone,
        role: member.role,
        isActive: member.isActive,
        team: member.team,
        settings: {
          baseSalary: member.baseSalary,
          salaryEffectiveFromMonth: member.salaryEffectiveFromMonth,
          homeAddress: member.homeAddress,
          homeLat: member.homeLat,
          homeLng: member.homeLng,
          bikeAverageKmPerLitre: member.bikeAverageKmPerLitre,
          fuelRatePerLitre: member.fuelRatePerLitre,
        },
        cash: {
          held: cashHeld,
          collected: cashCollected,
          deposited: cashDeposited,
        },
        recentLedgerEntries: member.ledgerEntries.slice(0, 10).map((entry) => ({
          ...entry,
          occurredAt: entry.occurredAt.toISOString(),
        })),
        recentDeposits: member.cashDeposits.map((deposit) => ({
          ...deposit,
          depositedAt: deposit.depositedAt.toISOString(),
        })),
      };
    });

    return NextResponse.json({
      summary: {
        groomerCount: groomers.length,
        activeGroomerCount: groomers.filter((groomer) => groomer.isActive).length,
        totalCashHeld: groomers.reduce((sum, groomer) => sum + groomer.cash.held, 0),
        totalCashCollected: groomers.reduce((sum, groomer) => sum + groomer.cash.collected, 0),
        totalCashDeposited: groomers.reduce((sum, groomer) => sum + groomer.cash.deposited, 0),
      },
      groomers,
    });
  } catch (error) {
    console.error("GET /api/admin/finance/groomers failed", error);
    return NextResponse.json({ error: "Failed to load groomer finance balances" }, { status: 500 });
  }
}
