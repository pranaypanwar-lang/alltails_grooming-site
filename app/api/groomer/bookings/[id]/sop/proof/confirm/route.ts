import { NextRequest, NextResponse } from "next/server";
import { adminPrisma, ensureBookingSopSteps, logBookingEvent } from "../../../../../../admin/_lib/bookingAdmin";
import { assertGroomerAccess } from "../../../../../_lib/assertGroomerAccess";
import { getBookingSopStepDefinition, isBookingSopStepKey } from "../../../../../../../../lib/booking/sop";
import { awardReviewReward } from "../../../../../../../../lib/groomerRewards";
import type { Prisma } from "../../../../../../../../lib/generated/prisma";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const token = request.nextUrl.searchParams.get("token");
    const access = await assertGroomerAccess(bookingId, token);
    if (access.error) return access.error;

    const body = await request.json().catch(() => ({}));
    const { stepKey, storageKey, publicUrl, mimeType, fileSize, originalName } = body as {
      stepKey: string;
      storageKey: string;
      publicUrl: string;
      mimeType: string;
      fileSize: number;
      originalName: string;
    };

    if (!isBookingSopStepKey(stepKey)) {
      return NextResponse.json({ error: "Invalid SOP step" }, { status: 400 });
    }
    if (!storageKey || !publicUrl) {
      return NextResponse.json({ error: "storageKey and publicUrl are required" }, { status: 400 });
    }

    const definition = getBookingSopStepDefinition(stepKey);
    if (!definition) {
      return NextResponse.json({ error: "SOP step configuration not found" }, { status: 400 });
    }

    const isVideo = mimeType?.startsWith("video/");

    const proof = await adminPrisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await ensureBookingSopSteps(tx, bookingId);
      const step = await tx.bookingSopStep.findUnique({
        where: { bookingId_stepKey: { bookingId, stepKey } },
      });
      if (!step) throw Object.assign(new Error("SOP step not found"), { httpStatus: 404 });

      await tx.bookingSopStep.update({
        where: { id: step.id },
        data: { status: "completed", completedAt: new Date(), completedBy: "groomer" },
      });

      return tx.bookingSopProof.create({
        data: {
          bookingId,
          bookingSopStepId: step.id,
          stepKey,
          proofType: isVideo ? "video" : "image",
          storageKey,
          publicUrl,
          originalName: originalName ?? "",
          mimeType: mimeType ?? "",
          sizeBytes: fileSize ?? 0,
        },
      });
    });

    await logBookingEvent({
      bookingId,
      actor: "groomer",
      type: "sop_proof_uploaded",
      summary: `${definition.label} proof uploaded`,
      metadata: { stepKey, proofType: proof.proofType, originalName: proof.originalName, source: "groomer_portal_direct" },
    });

    const reviewReward =
      stepKey === "review_proof" ? await awardReviewReward(adminPrisma, bookingId) : null;

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
      return NextResponse.json({ error: error.message }, { status: (error as Error & { httpStatus: number }).httpStatus });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to confirm upload" },
      { status: 500 }
    );
  }
}
