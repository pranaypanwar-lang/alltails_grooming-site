import type { Prisma, PrismaClient } from "../generated/prisma";
import { calculateCashHeld, getIstMonthBucket } from "./groomerLedger";

type DbClient = PrismaClient | Prisma.TransactionClient;

export type PayrollSummaryRow = {
  groomer: {
    id: string;
    name: string;
    phone: string | null;
    isActive: boolean;
    team: { id: string; name: string } | null;
  };
  monthBucket: string;
  baseSalary: number;
  fuelReimbursements: number;
  otherReimbursements: number;
  incentives: number;
  payrollAdjustments: number;
  advanceRecovery: number;
  grossCredits: number;
  netPayable: number;
  cashHeldSeparate: number;
  pendingExpenses: number;
  frozenSnapshot: {
    id: string;
    netPayable: number;
    frozenAt: string;
    frozenBy: string | null;
    notes: string | null;
  } | null;
};

function sumEntries(entries: Array<{ type: string; direction: string; amount: number }>, type: string) {
  return entries
    .filter((entry) => entry.type === type)
    .reduce((sum, entry) => {
      if (entry.direction === "credit") return sum + entry.amount;
      if (entry.direction === "debit") return sum - entry.amount;
      return sum;
    }, 0);
}

export function normalizePayrollMonth(value: string | null | undefined) {
  if (value && /^\d{4}-\d{2}$/.test(value)) return value;
  return getIstMonthBucket();
}

export async function getPayrollSummary(prisma: DbClient, monthBucket: string, groomerMemberId?: string) {
  const members = await prisma.teamMember.findMany({
    where: groomerMemberId ? { id: groomerMemberId } : undefined,
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      phone: true,
      isActive: true,
      baseSalary: true,
      team: { select: { id: true, name: true } },
      ledgerEntries: {
        where: { monthBucket },
        select: {
          type: true,
          direction: true,
          amount: true,
        },
      },
      expenses: {
        where: { status: "pending" },
        select: { amount: true },
      },
      salaryAdvanceRequests: {
        where: {
          status: "approved",
          recoverFromMonth: monthBucket,
        },
        select: { amount: true },
      },
      payrollSnapshots: {
        where: { monthBucket },
        take: 1,
        select: {
          id: true,
          netPayable: true,
          frozenAt: true,
          frozenBy: true,
          notes: true,
        },
      },
    },
  });

  const cashEntries = await prisma.groomerLedgerEntry.findMany({
    where: {
      ...(groomerMemberId ? { groomerMemberId } : {}),
      type: { in: ["cash_collected", "cash_deposited"] },
    },
    select: {
      groomerMemberId: true,
      direction: true,
      amount: true,
    },
  });

  const cashByGroomer = new Map<string, Array<{ direction: string; amount: number }>>();
  for (const entry of cashEntries) {
    const existing = cashByGroomer.get(entry.groomerMemberId) ?? [];
    existing.push(entry);
    cashByGroomer.set(entry.groomerMemberId, existing);
  }

  return members.map((member): PayrollSummaryRow => {
    const fuelReimbursements = sumEntries(member.ledgerEntries, "reimbursement_fuel");
    const otherReimbursements = sumEntries(member.ledgerEntries, "reimbursement_other");
    const incentives = sumEntries(member.ledgerEntries, "incentive");
    const payrollAdjustments = sumEntries(member.ledgerEntries, "payroll_adjustment");
    const advanceRecovery = member.salaryAdvanceRequests.reduce((sum, request) => sum + request.amount, 0);
    const grossCredits = member.baseSalary + fuelReimbursements + otherReimbursements + incentives;
    const netPayable = grossCredits - advanceRecovery;
    const snapshot = member.payrollSnapshots[0] ?? null;

    return {
      groomer: {
        id: member.id,
        name: member.name,
        phone: member.phone,
        isActive: member.isActive,
        team: member.team,
      },
      monthBucket,
      baseSalary: member.baseSalary,
      fuelReimbursements,
      otherReimbursements,
      incentives,
      payrollAdjustments,
      advanceRecovery,
      grossCredits,
      netPayable: netPayable + payrollAdjustments,
      cashHeldSeparate: calculateCashHeld(cashByGroomer.get(member.id) ?? []),
      pendingExpenses: member.expenses.reduce((sum, expense) => sum + expense.amount, 0),
      frozenSnapshot: snapshot
        ? {
            id: snapshot.id,
            netPayable: snapshot.netPayable,
            frozenAt: snapshot.frozenAt.toISOString(),
            frozenBy: snapshot.frozenBy,
            notes: snapshot.notes,
          }
        : null,
    };
  });
}
