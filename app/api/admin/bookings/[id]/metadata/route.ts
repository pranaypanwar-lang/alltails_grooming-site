import { NextResponse } from "next/server";
import { assertAdminSession } from "../../../_lib/assertAdmin";
import { adminPrisma, logAdminBookingEvent } from "../../../_lib/bookingAdmin";
import {
  getAddressReadinessSummary,
  normalizeOptionalText,
  normalizePincode,
} from "../../../../../../lib/booking/addressCapture";

export const runtime = "nodejs";

const ALLOWED_SOURCES = new Set([
  "website",
  "call",
  "instagram_dm",
  "whatsapp",
  "manual_internal",
]);

function normalizeAssetList(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const storageKey =
        "storageKey" in item && typeof item.storageKey === "string"
          ? item.storageKey.trim()
          : "";
      const publicUrl =
        "publicUrl" in item && typeof item.publicUrl === "string"
          ? item.publicUrl.trim()
          : "";
      const originalName =
        "originalName" in item && typeof item.originalName === "string"
          ? item.originalName.trim()
          : "";

      if (!storageKey || !publicUrl || !originalName) return null;
      return { storageKey, publicUrl, originalName };
    })
    .filter(
      (
        item
      ): item is { storageKey: string; publicUrl: string; originalName: string } =>
        !!item
    );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const { id: bookingId } = await params;
    const body = await request.json().catch(() => ({}));
    const bookingSource =
      typeof body.bookingSource === "string" ? body.bookingSource.trim() : "";
    const adminNote = normalizeOptionalText(body.adminNote);
    const serviceAddress = normalizeOptionalText(body.serviceAddress);
    const serviceLandmark = normalizeOptionalText(body.serviceLandmark);
    const servicePincode = normalizePincode(body.servicePincode);
    const serviceLocationUrl = normalizeOptionalText(body.serviceLocationUrl);
    const petPayloads: unknown[] = Array.isArray(body.pets) ? body.pets : [];

    if (!ALLOWED_SOURCES.has(bookingSource)) {
      return NextResponse.json({ error: "Invalid booking source" }, { status: 400 });
    }

    const booking = await adminPrisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        pets: {
          include: {
            assets: true,
          },
        },
      },
    });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const bookingPetIds = new Set(booking.pets.map((pet) => pet.id));
    const normalizedPets = petPayloads.map((pet: unknown, index: number) => {
      const petRecord = pet && typeof pet === "object" ? (pet as Record<string, unknown>) : null;
      const bookingPetId =
        petRecord && typeof petRecord.bookingPetId === "string"
          ? petRecord.bookingPetId
          : "";

      if (!bookingPetId || !bookingPetIds.has(bookingPetId)) {
        throw new Error(`Invalid booking pet at index ${index}`);
      }

      return {
        bookingPetId,
        stylingAssets: normalizeAssetList(petRecord?.stylingAssets ?? []),
        concernAssets: normalizeAssetList(petRecord?.concernAssets ?? []),
      };
    });

    const previousAddressStatus = getAddressReadinessSummary(booking);
    const nextAddressStatus = getAddressReadinessSummary({
      serviceAddress,
      serviceLandmark,
      servicePincode,
      serviceLocationUrl,
    });

    const sourceChanged = booking.bookingSource !== bookingSource;
    const noteChanged = booking.adminNote !== adminNote;
    const addressChanged =
      booking.serviceAddress !== serviceAddress ||
      booking.serviceLandmark !== serviceLandmark ||
      booking.servicePincode !== servicePincode ||
      booking.serviceLocationUrl !== serviceLocationUrl;
    const assetsChanged = normalizedPets.some((pet) => {
      const currentPet = booking.pets.find((item) => item.id === pet.bookingPetId);
      if (!currentPet) return false;

      const currentStyling = currentPet.assets
        .filter((asset) => asset.kind === "styling_reference")
        .map((asset) => `${asset.storageKey}::${asset.publicUrl}::${asset.originalName}`)
        .sort();
      const nextStyling = pet.stylingAssets
        .map((asset) => `${asset.storageKey}::${asset.publicUrl}::${asset.originalName}`)
        .sort();
      const currentConcern = currentPet.assets
        .filter((asset) => asset.kind === "concern_photo")
        .map((asset) => `${asset.storageKey}::${asset.publicUrl}::${asset.originalName}`)
        .sort();
      const nextConcern = pet.concernAssets
        .map((asset) => `${asset.storageKey}::${asset.publicUrl}::${asset.originalName}`)
        .sort();

      return (
        currentStyling.join("|") !== nextStyling.join("|") ||
        currentConcern.join("|") !== nextConcern.join("|")
      );
    });

    await adminPrisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          bookingSource,
          adminNote,
          serviceAddress,
          serviceLandmark,
          servicePincode,
          serviceLocationUrl,
          addressUpdatedAt: addressChanged ? new Date() : booking.addressUpdatedAt,
        },
      });

      for (const pet of normalizedPets) {
        await tx.bookingPetAsset.deleteMany({
          where: {
            bookingPetId: pet.bookingPetId,
            kind: {
              in: ["styling_reference", "concern_photo"],
            },
          },
        });

        const assetsToCreate = [
          ...pet.stylingAssets.map((asset) => ({
            bookingPetId: pet.bookingPetId,
            kind: "styling_reference",
            storageKey: asset.storageKey,
            publicUrl: asset.publicUrl,
            originalName: asset.originalName,
          })),
          ...pet.concernAssets.map((asset) => ({
            bookingPetId: pet.bookingPetId,
            kind: "concern_photo",
            storageKey: asset.storageKey,
            publicUrl: asset.publicUrl,
            originalName: asset.originalName,
          })),
        ];

        if (assetsToCreate.length) {
          await tx.bookingPetAsset.createMany({
            data: assetsToCreate,
          });
        }
      }
    });

    if (sourceChanged || noteChanged || addressChanged || assetsChanged) {
      const summaryParts: string[] = [];
      if (sourceChanged) {
        summaryParts.push(`Source updated to ${bookingSource.replace(/_/g, " ")}`);
      }
      if (addressChanged) {
        summaryParts.push(nextAddressStatus.statusLabel);
      }
      if (noteChanged) {
        summaryParts.push("Ops note updated");
      }
      if (assetsChanged) {
        summaryParts.push("Pet media updated");
      }

      await logAdminBookingEvent({
        bookingId,
        type: "booking_metadata_updated",
        summary: summaryParts.join(" · ") || "Booking metadata updated",
        metadata: {
          previousSource: booking.bookingSource,
          nextSource: bookingSource,
          noteUpdated: noteChanged,
          previousAddressStatus: previousAddressStatus.status,
          nextAddressStatus: nextAddressStatus.status,
          addressChanged,
          assetsChanged,
        },
      });
    }

    const updatedBooking = await adminPrisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        pets: {
          include: {
            pet: true,
            assets: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      bookingId,
      bookingSource,
      adminNote,
      addressInfo: {
        ...nextAddressStatus,
        serviceAddress,
        serviceLandmark,
        servicePincode,
        serviceLocationUrl,
        addressUpdatedAt: addressChanged
          ? new Date().toISOString()
          : booking.addressUpdatedAt?.toISOString() ?? null,
      },
      pets:
        updatedBooking?.pets.map((bp) => ({
          bookingPetId: bp.id,
          petId: bp.petId,
          sourcePetId: bp.sourcePetId ?? null,
          isSavedProfile: bp.isSavedProfile,
          name: bp.pet.name ?? null,
          breed: bp.pet.breed,
          groomingNotes: bp.groomingNotes ?? null,
          stylingNotes: bp.stylingNotes ?? null,
          stylingReferenceUrls: bp.assets
            .filter((a) => a.kind === "styling_reference")
            .map((a) => a.publicUrl),
          concernPhotoUrls: bp.assets
            .filter((a) => a.kind === "concern_photo")
            .map((a) => a.publicUrl),
          stylingReferenceAssets: bp.assets
            .filter((a) => a.kind === "styling_reference")
            .map((a) => ({
              id: a.id,
              storageKey: a.storageKey,
              publicUrl: a.publicUrl,
              originalName: a.originalName,
            })),
          concernPhotoAssets: bp.assets
            .filter((a) => a.kind === "concern_photo")
            .map((a) => ({
              id: a.id,
              storageKey: a.storageKey,
              publicUrl: a.publicUrl,
              originalName: a.originalName,
            })),
        })) ?? [],
    });
  } catch (error) {
    console.error("PATCH /api/admin/bookings/:id/metadata failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message.startsWith("Invalid booking pet")
            ? error.message
            : "Failed to update booking metadata",
      },
      { status: error instanceof Error && error.message.startsWith("Invalid booking pet") ? 400 : 500 }
    );
  }
}
