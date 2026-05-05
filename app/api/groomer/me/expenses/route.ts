import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getGroomerSessionMember } from "../../../../../lib/auth/groomerSession";
import { putBookingAsset } from "../../../../../lib/storage/putBookingAsset";
import { adminPrisma } from "../../../admin/_lib/bookingAdmin";

export const runtime = "nodejs";

const EXPENSE_CATEGORIES = new Set(["wipes", "equipment", "medicine", "parking", "other"]);

function serializeExpense(expense: {
  id: string;
  category: string;
  amount: number;
  billDate: Date | null;
  billPhotoUrl: string;
  notes: string | null;
  status: string;
  reviewNote: string | null;
  submittedAt: Date;
  reviewedAt: Date | null;
  bookingId: string | null;
}) {
  return {
    ...expense,
    billDate: expense.billDate?.toISOString() ?? null,
    submittedAt: expense.submittedAt.toISOString(),
    reviewedAt: expense.reviewedAt?.toISOString() ?? null,
  };
}

export async function GET() {
  try {
    const member = await getGroomerSessionMember();
    if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const expenses = await adminPrisma.groomerExpense.findMany({
      where: { groomerMemberId: member.id },
      orderBy: { submittedAt: "desc" },
      take: 50,
      select: {
        id: true,
        category: true,
        amount: true,
        billDate: true,
        billPhotoUrl: true,
        notes: true,
        status: true,
        reviewNote: true,
        submittedAt: true,
        reviewedAt: true,
        bookingId: true,
      },
    });

    return NextResponse.json({
      success: true,
      expenses: expenses.map(serializeExpense),
    });
  } catch (error) {
    console.error("GET /api/groomer/me/expenses failed", error);
    return NextResponse.json({ error: "Failed to load expenses" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const member = await getGroomerSessionMember();
    if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const category = typeof formData.get("category") === "string" ? String(formData.get("category")).trim() : "";
    const amount = Number(formData.get("amount"));
    const billDateRaw = typeof formData.get("billDate") === "string" ? String(formData.get("billDate")).trim() : "";
    const notes = typeof formData.get("notes") === "string" ? String(formData.get("notes")).trim() : "";
    const bookingId = typeof formData.get("bookingId") === "string" ? String(formData.get("bookingId")).trim() : "";
    const file = formData.get("file") instanceof File ? (formData.get("file") as File) : null;

    if (!EXPENSE_CATEGORIES.has(category)) {
      return NextResponse.json({ error: "Invalid expense category" }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Expense amount must be greater than zero" }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ error: "Bill photo is required" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Bill must be an image" }, { status: 400 });
    }
    if (file.size > 12 * 1024 * 1024) {
      return NextResponse.json({ error: "Bill image must be under 12MB" }, { status: 400 });
    }

    const billDate = billDateRaw ? new Date(billDateRaw) : null;
    if (billDate && Number.isNaN(billDate.getTime())) {
      return NextResponse.json({ error: "Invalid bill date" }, { status: 400 });
    }

    if (bookingId) {
      const booking = await adminPrisma.booking.findFirst({
        where: {
          id: bookingId,
          groomerMemberId: member.id,
        },
        select: { id: true },
      });
      if (!booking) {
        return NextResponse.json({ error: "Booking does not belong to this groomer" }, { status: 403 });
      }
    }

    const extension = file.name.split(".").pop() || "jpg";
    const storageKey = `groomer-expenses/${member.id}/${randomUUID()}.${extension}`;
    const uploaded = await putBookingAsset({
      storageKey,
      body: Buffer.from(await file.arrayBuffer()),
      contentType: file.type,
    });

    const expense = await adminPrisma.groomerExpense.create({
      data: {
        groomerMemberId: member.id,
        bookingId: bookingId || null,
        category,
        amount: Math.round(amount),
        billDate,
        billPhotoUrl: uploaded.publicUrl,
        storageKey,
        notes: notes || null,
      },
      select: {
        id: true,
        category: true,
        amount: true,
        billDate: true,
        billPhotoUrl: true,
        notes: true,
        status: true,
        reviewNote: true,
        submittedAt: true,
        reviewedAt: true,
        bookingId: true,
      },
    });

    return NextResponse.json({
      success: true,
      expense: serializeExpense(expense),
    });
  } catch (error) {
    console.error("POST /api/groomer/me/expenses failed", error);
    return NextResponse.json({ error: "Failed to submit expense" }, { status: 500 });
  }
}
