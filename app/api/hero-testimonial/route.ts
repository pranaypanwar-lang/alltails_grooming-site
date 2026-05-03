import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../lib/generated/prisma";
import { HERO_TESTIMONIAL_DEFAULT } from "../../../lib/content/heroTestimonialDefault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

export async function GET() {
  try {
    const testimonial = await prisma.heroTestimonial.findFirst({
      where: { slug: "active", isActive: true },
    });

    if (!testimonial) {
      return NextResponse.json({ testimonial: HERO_TESTIMONIAL_DEFAULT });
    }

    return NextResponse.json({
      testimonial: {
        slug: testimonial.slug,
        quote: testimonial.quote,
        authorName: testimonial.authorName,
        authorLocation: testimonial.authorLocation,
      },
    });
  } catch {
    return NextResponse.json({ testimonial: HERO_TESTIMONIAL_DEFAULT });
  }
}
