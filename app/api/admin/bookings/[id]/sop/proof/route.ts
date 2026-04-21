import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { assertAdminSession } from "../../../../_lib/assertAdmin";
import { adminPrisma, ensureBookingSopSteps, logAdminBookingEvent } from "../../../../_lib/bookingAdmin";
import { getBookingSopStepDefinition, isBookingSopStepKey } from "../../../../../../../lib/booking/sop";
import { putBookingAsset } from "../../../../../../../lib/storage/putBookingAsset";

export const runtime = "nodejs";

function getProofFolder(stepKey: string) {
  return `booking-sop/${stepKey}`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const { id: bookingId } = await params;
    const formData = await request.formData();

    const file = formData.get("file");
    const stepKey = typeof formData.get("stepKey") === "string" ? String(formData.get("stepKey")).trim() : "";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    if (!isBookingSopStepKey(stepKey)) {
      return NextResponse.json({ error: "Invalid SOP step" }, { status: 400 });
    }

    const definition = getBookingSopStepDefinition(stepKey);
    if (!definition) {
      return NextResponse.json({ error: "SOP step configuration not found" }, { status: 400 });
    }

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      return NextResponse.json({ error: "Only image or video uploads are allowed" }, { status: 400 });
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "Max allowed size is 50MB" }, { status: 400 });
    }

    const extension = file.name.split(".").pop() || (isVideo ? "mp4" : "jpg");
    const storageKey = `${getProofFolder(stepKey)}/${bookingId}/${randomUUID()}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const uploaded = await putBookingAsset({
      storageKey,
      body: buffer,
      contentType: file.type,
    });

    const proof = await adminPrisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id: bookingId }, select: { id: true } });
      if (!booking) {
        throw Object.assign(new Error("Booking not found"), { httpStatus: 404 });
      }

      await ensureBookingSopSteps(tx, bookingId);

      const step = await tx.bookingSopStep.findUnique({
        where: { bookingId_stepKey: { bookingId, stepKey } },
      });

      if (!step) {
        throw Object.assign(new Error("SOP step not found"), { httpStatus: 404 });
      }

      await tx.bookingSopStep.update({
        where: { id: step.id },
        data: {
          status: "completed",
          completedAt: new Date(),
          completedBy: "admin",
        },
      });

      return tx.bookingSopProof.create({
        data: {
          bookingId,
          bookingSopStepId: step.id,
          stepKey,
          proofType: isVideo ? "video" : "image",
          storageKey,
          publicUrl: uploaded.publicUrl,
          originalName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        },
      });
    });

    await logAdminBookingEvent({
      bookingId,
      type: "sop_proof_uploaded",
      summary: `${definition.label} proof uploaded`,
      metadata: {
        stepKey,
        proofType: proof.proofType,
        originalName: proof.originalName,
      },
    });

    return NextResponse.json({
      success: true,
      bookingId,
      stepKey,
      proof: {
        id: proof.id,
        stepKey: proof.stepKey,
        proofType: proof.proofType,
        publicUrl: proof.publicUrl,
        originalName: proof.originalName,
        mimeType: proof.mimeType,
        sizeBytes: proof.sizeBytes,
        createdAt: proof.createdAt.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof Error && "httpStatus" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as Error & { httpStatus: number }).httpStatus }
      );
    }

    console.error("POST /api/admin/bookings/:id/sop/proof failed", error);
    return NextResponse.json({ error: "Failed to upload SOP proof" }, { status: 500 });
  }
}
