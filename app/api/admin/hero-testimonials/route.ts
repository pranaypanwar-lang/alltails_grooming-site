import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../lib/generated/prisma";
import { assertAdminSession } from "../_lib/assertAdmin";
import { HERO_TESTIMONIAL_DEFAULT } from "../../../../lib/content/heroTestimonialDefault";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

export async function GET() {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const testimonial = await prisma.heroTestimonial.upsert({
      where: { slug: "active" },
      update: {},
      create: {
        slug: HERO_TESTIMONIAL_DEFAULT.slug,
        quote: HERO_TESTIMONIAL_DEFAULT.quote,
        authorName: HERO_TESTIMONIAL_DEFAULT.authorName,
        authorLocation: HERO_TESTIMONIAL_DEFAULT.authorLocation,
      },
    });

    return NextResponse.json({ testimonial });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load hero testimonial" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const body = await request.json();

    const quote = String(body.quote ?? "").trim();
    const authorName = String(body.authorName ?? "").trim();
    const authorLocation = String(body.authorLocation ?? "").trim();
    const isActive = body.isActive !== false;

    let bookedAt: Date | null = null;
    if (body.bookedAt) {
      const parsed = new Date(String(body.bookedAt));
      if (!Number.isNaN(parsed.getTime())) {
        bookedAt = parsed;
      }
    }

    if (!quote || !authorName || !authorLocation) {
      return NextResponse.json(
        { error: "Quote, author name, and author location are required." },
        { status: 400 }
      );
    }

    const testimonial = await prisma.heroTestimonial.upsert({
      where: { slug: "active" },
      update: { quote, authorName, authorLocation, isActive, bookedAt },
      create: {
        slug: "active",
        quote,
        authorName,
        authorLocation,
        isActive,
        bookedAt,
      },
    });

    return NextResponse.json({ testimonial });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update hero testimonial" },
      { status: 500 }
    );
  }
}
