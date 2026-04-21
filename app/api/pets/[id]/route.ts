import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../lib/generated/prisma";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const normalizePhone = (phone: string) => phone.replace(/\D/g, "").slice(-10);
const normalizePetName = (name: string | null) => (name || "").trim().toLowerCase();
const normalizePetBreed = (breed: string) => breed.trim().toLowerCase().replace(/\s+/g, " ");
const buildCompanionKey = (name: string | null, breed: string) => {
  const n = normalizePetName(name);
  const b = normalizePetBreed(breed);
  return n ? `${n}__${b}` : `__breed__${b}`;
};

const CAT_BREEDS = ["persian", "siamese", "maine coon", "ragdoll", "british shorthair", "bengal", "sphynx", "cat"];
const inferSpecies = (breed: string): "dog" | "cat" | "unknown" => {
  const s = breed.trim().toLowerCase();
  if (!s) return "unknown";
  if (CAT_BREEDS.some((b) => s.includes(b))) return "cat";
  return "dog";
};

function buildSavedCompanion(pet: any) {
  const assets: any[] = pet.assets || [];
  const stylingRefs = assets.filter((a) => a.kind === "styling_reference").map((a) => a.publicUrl);
  const avatar = assets.find((a) => a.kind === "avatar")?.publicUrl || pet.avatarUrl || null;
  return {
    id: pet.id,
    name: pet.name,
    breed: pet.breed,
    species: (pet.species && pet.species !== "unknown" ? pet.species : inferSpecies(pet.breed)) as "dog" | "cat" | "unknown",
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      phone,
      name,
      breed,
      species,
      avatarUrl,
      defaultGroomingNotes,
      defaultStylingNotes,
      defaultStylingReferenceUrls,
    }: {
      phone?: string;
      name?: string | null;
      breed?: string;
      species?: "dog" | "cat" | "unknown";
      avatarUrl?: string | null;
      defaultGroomingNotes?: string | null;
      defaultStylingNotes?: string | null;
      defaultStylingReferenceUrls?: string[];
    } = body;

    if (!phone?.trim()) {
      return NextResponse.json({ error: "Phone is required." }, { status: 400 });
    }

    const normalizedPhone = normalizePhone(phone);
    const user = await prisma.user.findFirst({
      where: { phone: { endsWith: normalizedPhone } },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

    const existingPet = await prisma.pet.findFirst({
      where: { id, userId: user.id },
      include: { assets: true },
    });
    if (!existingPet) {
      return NextResponse.json({ error: "Saved companion not found." }, { status: 404 });
    }

    const nextName = name !== undefined ? name?.trim() || null : existingPet.name;
    const nextBreed = breed !== undefined ? breed.trim() : existingPet.breed;

    if (!nextBreed.trim()) {
      return NextResponse.json({ error: "Breed is required." }, { status: 400 });
    }

    const incomingKey = buildCompanionKey(nextName, nextBreed);
    const siblings = await prisma.pet.findMany({
      where: { userId: user.id, isArchived: false, NOT: { id: existingPet.id } },
    });
    const duplicate = siblings.find((p) => buildCompanionKey(p.name, p.breed) === incomingKey);
    if (duplicate) {
      return NextResponse.json(
        { error: "Another saved companion with the same name and breed already exists." },
        { status: 409 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const pet = await tx.pet.update({
        where: { id: existingPet.id },
        data: {
          name: nextName,
          breed: nextBreed,
          species: species || inferSpecies(nextBreed),
          avatarUrl: avatarUrl !== undefined ? avatarUrl : existingPet.avatarUrl,
          defaultGroomingNotes:
            defaultGroomingNotes !== undefined
              ? defaultGroomingNotes?.trim() || null
              : existingPet.defaultGroomingNotes,
          defaultStylingNotes:
            defaultStylingNotes !== undefined
              ? defaultStylingNotes?.trim() || null
              : existingPet.defaultStylingNotes,
        },
      });

      if (defaultStylingReferenceUrls !== undefined) {
        await tx.petAsset.deleteMany({
          where: {
            petId: existingPet.id,
            kind: "styling_reference",
          },
        });

        for (const publicUrl of defaultStylingReferenceUrls.filter(Boolean)) {
          await tx.petAsset.create({
            data: {
              petId: existingPet.id,
              kind: "styling_reference",
              storageKey: publicUrl,
              publicUrl,
              originalName: "styling-reference",
            },
          });
        }
      }

      return tx.pet.findUniqueOrThrow({
        where: { id: pet.id },
        include: { assets: true },
      });
    });

    return NextResponse.json({ companion: buildSavedCompanion(updated) });
  } catch (error) {
    console.error("PATCH /api/pets/:id failed", error);
    return NextResponse.json({ error: "Failed to update saved companion." }, { status: 500 });
  }
}
