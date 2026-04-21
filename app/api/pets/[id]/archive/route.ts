import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../lib/generated/prisma";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const normalizePhone = (phone: string) => phone.replace(/\D/g, "").slice(-10);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { phone }: { phone?: string } = body;

    if (!phone?.trim()) {
      return NextResponse.json({ error: "Phone is required." }, { status: 400 });
    }

    const normalizedPhone = normalizePhone(phone);
    const user = await prisma.user.findFirst({
      where: { phone: { endsWith: normalizedPhone } },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

    const pet = await prisma.pet.findFirst({
      where: { id, userId: user.id },
    });
    if (!pet) {
      return NextResponse.json({ error: "Saved companion not found." }, { status: 404 });
    }

    if (pet.isArchived) {
      return NextResponse.json({ error: "Companion is already archived." }, { status: 400 });
    }

    await prisma.pet.update({
      where: { id: pet.id },
      data: { isArchived: true },
    });

    return NextResponse.json({ success: true, id: pet.id, isArchived: true });
  } catch (error) {
    console.error("POST /api/pets/:id/archive failed", error);
    return NextResponse.json({ error: "Failed to archive saved companion." }, { status: 500 });
  }
}
