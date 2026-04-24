import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { adminPrisma, ensureBookingSopSteps, logBookingEvent } from "../../../../../admin/_lib/bookingAdmin";
import { assertGroomerAccess } from "../../../../_lib/assertGroomerAccess";
import { getBookingSopStepDefinition, isBookingSopStepKey } from "../../../../../../../lib/booking/sop";
import { putBookingAsset } from "../../../../../../../lib/storage/putBookingAsset";
import { awardReviewReward } from "../../../../../../../lib/groomerRewards";

export const runtime = "nodejs";

function normalizeMimeType(type: string) {
  return type.split(";")[0]?.trim().toLowerCase();
}

function getProofFolder(stepKey: string) {
  return `booking-sop/${stepKey}`;
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

    const normalizedMimeType = normalizeMimeType(file.type);
    const isImage = normalizedMimeType.startsWith("image/");
    const isVideo = normalizedMimeType.startsWith("video/");
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
      contentType: normalizedMimeType || file.type || (isVideo ? "video/webm" : "image/jpeg"),
    });

    const proof = await adminPrisma.$transaction(async (tx) => {
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
          completedBy: "groomer",
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
          mimeType: normalizedMimeType || file.type,
          sizeBytes: file.size,
        },
      });
    });

    await logBookingEvent({
      bookingId,
      actor: "groomer",
      type: "sop_proof_uploaded",
      summary: `${definition.label} proof uploaded`,
      metadata: {
        stepKey,
        proofType: proof.proofType,
        originalName: proof.originalName,
        source: "groomer_portal",
      },
    });

    const reviewReward =
      stepKey === "review_proof"
        ? await awardReviewReward(adminPrisma, bookingId)
        : null;

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
      rewardsDelta: reviewReward?.rewardsDelta ?? [],
      rewardSummary: reviewReward?.rewardSummary ?? null,
    });
  } catch (error) {
    if (error instanceof Error && "httpStatus" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as Error & { httpStatus: number }).httpStatus }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload SOP proof" },
      { status: 500 }
    );
  }
}
