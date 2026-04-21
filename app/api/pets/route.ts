import { NextRequest, NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../lib/generated/prisma";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const normalizePhone = (phone: string) => phone.replace(/\D/g, "").slice(-10);
const normalizePetName = (name: string | null) => (name || "").trim().toLowerCase();
const normalizePetBreed = (breed: string) =>
  breed.trim().toLowerCase().replace(/\s+/g, " ");
const buildCompanionKey = (name: string | null, breed: string) => {
  const n = normalizePetName(name);
  const b = normalizePetBreed(breed);
  return n ? `${n}__${b}` : `__breed__${b}`;
};

const CAT_BREEDS = [
  "persian",
  "siamese",
  "maine coon",
  "ragdoll",
  "british shorthair",
  "bengal",
  "sphynx",
  "cat",
];

const inferSpecies = (breed: string): "dog" | "cat" | "unknown" => {
  const s = breed.trim().toLowerCase();
  if (!s) return "unknown";
  if (CAT_BREEDS.some((b) => s.includes(b))) return "cat";
  return "dog";
};

function buildSavedCompanion(pet: any) {
  const assets: any[] = pet.assets || [];
  const stylingRefs = assets
    .filter((a) => a.kind === "styling_reference")
    .map((a) => a.publicUrl);

  const avatar =
    assets.find((a) => a.kind === "avatar")?.publicUrl ||
    pet.avatarUrl ||
    null;

  return {
    id: pet.id,
    name: pet.name,
    breed: pet.breed,
    species: (pet.species && pet.species !== "unknown"
      ? pet.species
      : inferSpecies(pet.breed)) as "dog" | "cat" | "unknown",
    avatarUrl: avatar,
    defaultGroomingNotes: pet.defaultGroomingNotes ?? null,
    defaultStylingNotes: pet.defaultStylingNotes ?? null,
    defaultStylingReferenceUrls: stylingRefs,
    lastBookedAt: pet.lastBookedAt ? new Date(pet.lastBookedAt).toISOString() : null,
    isArchived: !!pet.isArchived,
    createdAt: new Date(pet.createdAt).toISOString(),
    updatedAt: new Date(pet.updatedAt).toISOString(),
  };
}

export async function GET(req: NextRequest) {
  try {
    const phone = normalizePhone(req.nextUrl.searchParams.get("phone") || "");

    if (phone.length < 10) {
      return NextResponse.json(
        { error: "Valid phone number is required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { phone: { endsWith: phone } },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ companions: [] });
    }

    const pets = await prisma.pet.findMany({
      where: {
        userId: user.id,
        isArchived: false,
      },
      include: {
        assets: true,
      },
      orderBy: [{ lastBookedAt: "desc" }, { updatedAt: "desc" }],
    });

    return NextResponse.json({
      companions: pets.map(buildSavedCompanion),
    });
  } catch (error) {
    console.error("GET /api/pets failed", error);
    return NextResponse.json(
      { error: "Failed to fetch saved companions." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      phone,
      name,
      breed,
      species,
      defaultGroomingNotes,
      defaultStylingNotes,
      defaultStylingReferenceUrls,
      avatarUrl,
    }: {
      phone?: string;
      name?: string | null;
      breed?: string;
      species?: "dog" | "cat" | "unknown";
      defaultGroomingNotes?: string | null;
      defaultStylingNotes?: string | null;
      defaultStylingReferenceUrls?: string[];
      avatarUrl?: string | null;
    } = body;

    if (!phone?.trim()) {
      return NextResponse.json(
        { error: "Phone is required." },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhone(phone);
    if (normalizedPhone.length < 10) {
      return NextResponse.json(
        { error: "Valid phone number is required." },
        { status: 400 }
      );
    }

    const nextBreed = breed?.trim() || "";
    if (!nextBreed) {
      return NextResponse.json(
        { error: "Breed is required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { phone: { endsWith: normalizedPhone } },
      orderBy: { createdAt: "asc" },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found. Create a booking first or use an existing customer number." },
        { status: 404 }
      );
    }

    const nextName = name?.trim() || null;
    const incomingKey = buildCompanionKey(nextName, nextBreed);

    const siblings = await prisma.pet.findMany({
      where: {
        userId: user.id,
        isArchived: false,
      },
    });

    const duplicate = siblings.find(
      (pet) => buildCompanionKey(pet.name, pet.breed) === incomingKey
    );

    if (duplicate) {
      return NextResponse.json(
        { error: "A saved companion with the same name and breed already exists." },
        { status: 409 }
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      const pet = await tx.pet.create({
        data: {
          userId: user.id,
          name: nextName,
          breed: nextBreed,
          species: species || inferSpecies(nextBreed),
          avatarUrl: avatarUrl?.trim() || null,
          defaultGroomingNotes: defaultGroomingNotes?.trim() || null,
          defaultStylingNotes: defaultStylingNotes?.trim() || null,
        },
      });

      for (const publicUrl of (defaultStylingReferenceUrls || []).filter(Boolean)) {
        await tx.petAsset.create({
          data: {
            petId: pet.id,
            kind: "styling_reference",
            storageKey: publicUrl,
            publicUrl,
            originalName: "styling-reference",
          },
        });
      }

      return tx.pet.findUniqueOrThrow({
        where: { id: pet.id },
        include: { assets: true },
      });
    });

    return NextResponse.json({
      companion: buildSavedCompanion(created),
    });
  } catch (error) {
    console.error("POST /api/pets failed", error);
    return NextResponse.json(
      { error: "Failed to create saved companion." },
      { status: 500 }
    );
  }
}
