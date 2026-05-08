import { NextRequest, NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../lib/generated/prisma";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const normalizePhone = (phone: string) => phone.replace(/\D/g, "").slice(-10);

const CAT_BREEDS = ["persian", "siamese", "maine coon", "ragdoll", "british shorthair", "bengal", "sphynx", "cat"];
const normalizePetName = (name: string | null) => (name || "").trim().toLowerCase();
const normalizePetBreed = (breed: string) => breed.trim().toLowerCase().replace(/\s+/g, " ");
const buildCompanionKey = (name: string | null, breed: string) => {
  const normalizedName = normalizePetName(name);
  const normalizedBreed = normalizePetBreed(breed);
  return normalizedName ? `${normalizedName}__${normalizedBreed}` : `__breed__${normalizedBreed}`;
};

const inferSpecies = (breed: string): "dog" | "cat" | "unknown" => {
  const s = breed.trim().toLowerCase();
  if (!s) return "unknown";
  if (CAT_BREEDS.some((b) => s.includes(b))) return "cat";
  return "dog";
};

export async function GET(req: NextRequest) {
  try {
    const phone = normalizePhone(req.nextUrl.searchParams.get("phone") || "");
    if (phone.length < 10) return NextResponse.json({ found: false, pets: [] });

    const user = await prisma.user.findFirst({
      where: { phone: { endsWith: phone } },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ found: false, pets: [] });

    // Canonical pet profiles — active only, most recently booked first.
    const pets = await prisma.pet.findMany({
      where: { userId: user.id, isArchived: false },
      include: { assets: true },
      orderBy: [{ lastBookedAt: "desc" }, { updatedAt: "desc" }],
      take: 8,
    });

    // If no canonical profiles yet, fall back to booking-history dedupe for
    // customers who pre-date the profile system.
    if (pets.length === 0) {
      const bookingPets = await prisma.bookingPet.findMany({
        where: { booking: { userId: user.id } },
        include: {
          pet: { select: { id: true, name: true, breed: true } },
          booking: { select: { createdAt: true } },
        },
        orderBy: { booking: { createdAt: "desc" } },
      });

      const deduped = new Map<string, { petId: string; name: string | null; breed: string; imageUrl: string | null; species: "dog" | "cat" | "unknown"; lastBookedAt: string | null; defaultGroomingNotes: null; defaultStylingNotes: null; temperament: null }>();
      const normName = (n: string | null) => (n || "").trim().toLowerCase();
      const normBreed = (b: string) => b.trim().toLowerCase().replace(/\s+/g, " ");

      for (const item of bookingPets) {
        const { pet, booking } = item;
        const key = normName(pet.name)
          ? `${normName(pet.name)}__${normBreed(pet.breed)}`
          : `__breed__${normBreed(pet.breed)}`;
        if (!deduped.has(key)) {
          deduped.set(key, {
            petId: pet.id,
            name: pet.name,
            breed: pet.breed,
            imageUrl: null,
            species: inferSpecies(pet.breed),
            lastBookedAt: booking.createdAt.toISOString(),
            defaultGroomingNotes: null,
            defaultStylingNotes: null,
            temperament: null,
          });
        }
      }

      const legacy = Array.from(deduped.values()).slice(0, 8);
      return NextResponse.json({ found: legacy.length > 0, pets: legacy });
    }

    const dedupedPets = Array.from(
      pets
        .reduce((map, pet) => {
          const key = buildCompanionKey(pet.name, pet.breed);
          if (!map.has(key)) map.set(key, pet);
          return map;
        }, new Map<string, typeof pets[number]>())
        .values()
    );

    const result = dedupedPets.map((p) => {
      const avatar = p.assets.find((a) => a.kind === "avatar")?.publicUrl || p.avatarUrl || null;
      return {
        petId: p.id,
        name: p.name,
        breed: p.breed,
        imageUrl: avatar,
        species: (p.species && p.species !== "unknown" ? p.species : inferSpecies(p.breed)) as "dog" | "cat" | "unknown",
        lastBookedAt: p.lastBookedAt ? p.lastBookedAt.toISOString() : null,
        defaultGroomingNotes: p.defaultGroomingNotes ?? null,
        defaultStylingNotes: p.defaultStylingNotes ?? null,
        temperament: p.temperament ?? null,
      };
    });

    return NextResponse.json({ found: result.length > 0, pets: result });
  } catch (error) {
    console.error("GET /api/pets/by-phone failed", error);
    return NextResponse.json({ error: "Failed to fetch saved pets." }, { status: 500 });
  }
}
