import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { adminPrisma, ensureBookingSopSteps, logBookingEvent } from "../../../../admin/_lib/bookingAdmin";
import { assertGroomerAccess } from "../../../_lib/assertGroomerAccess";
import { putBookingAsset } from "../../../../../../lib/storage/putBookingAsset";
import { syncCashCollectionLedgerForBooking } from "../../../../../../lib/finance/groomerLedger";

export const runtime = "nodejs";
const MAX_PAYMENT_PROOF_BYTES = 4 * 1024 * 1024;

function getExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

function inferImageMimeType(file: File) {
  const normalized = file.type.split(";")[0]?.trim().toLowerCase();
  if (normalized) return normalized;
  const extension = getExtension(file.name);
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "heic") return "image/heic";
  if (extension === "heif") return "image/heif";
  if (["jpg", "jpeg"].includes(extension)) return "image/jpeg";
  return "";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const token = request.nextUrl.searchParams.get("token");
    const access = await assertGroomerAccess(bookingId, token);
    if (access.error) return access.error;

    const contentType = request.headers.get("content-type") ?? "";
    let collectionMode = "";
    let notes: string | null = null;
    let collectedAmount = Number.NaN;
    let applyServiceAmountChange = false;
    let file: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      collectionMode = typeof formData.get("collectionMode") === "string" ? String(formData.get("collectionMode")).trim() : "";
      notes = typeof formData.get("notes") === "string" ? String(formData.get("notes")).trim() || null : null;
      collectedAmount = Number(formData.get("collectedAmount"));
      applyServiceAmountChange = formData.get("applyServiceAmountChange") === "true";
      file = formData.get("file") instanceof File ? (formData.get("file") as File) : null;
    } else {
      const body = await request.json().catch(() => ({}));
      collectionMode = typeof body.collectionMode === "string" ? body.collectionMode.trim() : "";
      notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
      collectedAmount = Number(body.collectedAmount);
      applyServiceAmountChange = body.applyServiceAmountChange === true;
    }

    if (!["cash", "online", "waived"].includes(collectionMode)) {
      return NextResponse.json({ error: "Invalid collection mode" }, { status: 400 });
    }
    if (!Number.isFinite(collectedAmount) || collectedAmount < 0) {
      return NextResponse.json({ error: "Invalid collected amount" }, { status: 400 });
    }
    if (collectionMode !== "waived" && !file) {
      return NextResponse.json({ error: "Payment photo or screenshot is required" }, { status: 400 });
    }
    const paymentMimeType = file ? inferImageMimeType(file) : "";
    if (file) {
      if (!paymentMimeType.startsWith("image/")) {
        return NextResponse.json({ error: "Only image uploads are allowed for payment" }, { status: 400 });
      }
      if (file.size > MAX_PAYMENT_PROOF_BYTES) {
        return NextResponse.json({ error: "Payment image must be under 4MB. Please retake the photo or send a lighter screenshot." }, { status: 400 });
      }
    }

    const booking = await adminPrisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, finalAmount: true },
    });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const uploadedPaymentImage = file ? await (async () => {
      const extension = getExtension(file.name) || "jpg";
      const storageKey = `booking-sop/payment_proof/${bookingId}/${randomUUID()}.${extension}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploaded = await putBookingAsset({
        storageKey,
        body: buffer,
        contentType: paymentMimeType || "image/jpeg",
      });
      return {
        storageKey,
        publicUrl: uploaded.publicUrl,
        originalName: file.name,
        mimeType: paymentMimeType || file.type,
        sizeBytes: file.size,
      };
    })() : null;

    const paymentCollection = await adminPrisma.$transaction(async (tx) => {
      await ensureBookingSopSteps(tx, bookingId);

      const expectedAmount = booking.finalAmount;
      if (applyServiceAmountChange && notes == null) {
        throw Object.assign(new Error("Plan change note is required when updating the service amount"), { httpStatus: 400 });
      }
      if (applyServiceAmountChange) {
        const paymentMethod = await tx.booking.findUnique({
          where: { id: bookingId },
          select: { paymentMethod: true },
        });
        if (paymentMethod?.paymentMethod !== "pay_after_service" && paymentMethod?.paymentMethod !== "cash") {
          throw Object.assign(new Error("Service amount changes are only allowed for post-service payment bookings"), { httpStatus: 400 });
        }
      }

      const mismatchFlag =
        collectionMode !== "waived" &&
        collectedAmount !== expectedAmount &&
        !applyServiceAmountChange;

      const record = await tx.bookingPaymentCollection.upsert({
        where: { bookingId },
        create: {
          bookingId,
          collectionMode,
          collectedAmount,
          expectedAmount,
          mismatchFlag,
          notes,
          recordedBy: "groomer",
        },
        update: {
          collectionMode,
          collectedAmount,
          expectedAmount,
          mismatchFlag,
          notes,
          recordedBy: "groomer",
          recordedAt: new Date(),
        },
      });

      if (applyServiceAmountChange && booking.finalAmount !== collectedAmount) {
        await tx.booking.update({
          where: { id: bookingId },
          data: {
            finalAmount: collectedAmount,
          },
        });
      }

      await syncCashCollectionLedgerForBooking(tx, bookingId);

      await tx.bookingSopStep.update({
        where: { bookingId_stepKey: { bookingId, stepKey: "payment_proof" } },
        data: {
          status: "completed",
          completedAt: new Date(),
          completedBy: "groomer",
        },
      });

      if (uploadedPaymentImage) {
        const step = await tx.bookingSopStep.findUnique({
          where: { bookingId_stepKey: { bookingId, stepKey: "payment_proof" } },
        });
        if (!step) {
          throw Object.assign(new Error("Payment step not found"), { httpStatus: 404 });
        }

        await tx.bookingSopProof.create({
          data: {
            bookingId,
            bookingSopStepId: step.id,
            stepKey: "payment_proof",
            proofType: "image",
            storageKey: uploadedPaymentImage.storageKey,
            publicUrl: uploadedPaymentImage.publicUrl,
            originalName: uploadedPaymentImage.originalName,
            mimeType: uploadedPaymentImage.mimeType,
            sizeBytes: uploadedPaymentImage.sizeBytes,
          },
        });
      }

      return record;
    });

    await logBookingEvent({
      bookingId,
      actor: "groomer",
      type: applyServiceAmountChange ? "service_amount_updated" : "payment_recorded",
      summary: applyServiceAmountChange
        ? (collectedAmount > paymentCollection.expectedAmount ? "Service amount updated for upsell" : "Service amount updated for downgrade")
        : `Payment update saved via ${collectionMode}`,
      metadata: {
        collectionMode,
        collectedAmount,
        expectedAmount: paymentCollection.expectedAmount,
        mismatchFlag: paymentCollection.mismatchFlag,
        applyServiceAmountChange,
        paymentImageUploaded: !!uploadedPaymentImage,
        source: "groomer_portal",
      },
    });

    return NextResponse.json({
      success: true,
      bookingId,
      paymentCollection: {
        collectionMode: paymentCollection.collectionMode,
        collectedAmount: paymentCollection.collectedAmount,
        expectedAmount: paymentCollection.expectedAmount,
        mismatchFlag: paymentCollection.mismatchFlag,
        serviceAmountUpdated: !paymentCollection.mismatchFlag && paymentCollection.collectedAmount !== paymentCollection.expectedAmount,
        serviceAmountDirection:
          !paymentCollection.mismatchFlag && paymentCollection.collectedAmount !== paymentCollection.expectedAmount
            ? paymentCollection.collectedAmount > paymentCollection.expectedAmount
              ? "upsell"
              : "downgrade"
            : null,
        notes: paymentCollection.notes ?? null,
        recordedAt: paymentCollection.recordedAt.toISOString(),
        recordedBy: paymentCollection.recordedBy ?? null,
      },
      finalAmount: applyServiceAmountChange ? collectedAmount : booking.finalAmount,
      paymentImage: uploadedPaymentImage
        ? {
            publicUrl: uploadedPaymentImage.publicUrl,
            originalName: uploadedPaymentImage.originalName,
          }
        : null,
    });
  } catch (error) {
    if (error instanceof Error && "httpStatus" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as Error & { httpStatus: number }).httpStatus }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save payment details" },
      { status: 500 }
    );
  }
}
