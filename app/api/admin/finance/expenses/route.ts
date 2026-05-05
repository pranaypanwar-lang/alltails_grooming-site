import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../_lib/assertAdmin";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

export async function GET(request: Request) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status")?.trim();

    const expenses = await prisma.groomerExpense.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ status: "asc" }, { submittedAt: "desc" }],
      take: 100,
      include: {
        groomerMember: {
          select: {
            id: true,
            name: true,
            phone: true,
            team: { select: { id: true, name: true } },
          },
        },
        booking: {
          select: {
            id: true,
            selectedDate: true,
            serviceAddress: true,
            servicePincode: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      expenses: expenses.map((expense) => ({
        id: expense.id,
        category: expense.category,
        amount: expense.amount,
        billDate: expense.billDate?.toISOString() ?? null,
        billPhotoUrl: expense.billPhotoUrl,
        notes: expense.notes,
        status: expense.status,
        reviewNote: expense.reviewNote,
        submittedAt: expense.submittedAt.toISOString(),
        reviewedAt: expense.reviewedAt?.toISOString() ?? null,
        groomer: expense.groomerMember,
        booking: expense.booking,
      })),
    });
  } catch (error) {
    console.error("GET /api/admin/finance/expenses failed", error);
    return NextResponse.json({ error: "Failed to load expenses" }, { status: 500 });
  }
}
