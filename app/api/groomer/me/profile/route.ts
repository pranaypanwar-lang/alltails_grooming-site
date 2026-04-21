import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { adminPrisma } from "../../../admin/_lib/bookingAdmin";
import { getGroomerSessionMember } from "../../../../../lib/auth/groomerSession";
import { putBookingAsset } from "../../../../../lib/storage/putBookingAsset";
import { awardGroomerXp } from "../../../../../lib/groomerRewards";

export const runtime = "nodejs";

async function uploadDoc(file: File | null, folder: string) {
  if (!file) return null;
  const extension = file.name.split(".").pop() || "jpg";
  const storageKey = `${folder}/${randomUUID()}.${extension}`;
  const uploaded = await putBookingAsset({
    storageKey,
    body: Buffer.from(await file.arrayBuffer()),
    contentType: file.type,
  });
  return uploaded.publicUrl;
}

export async function POST(request: NextRequest) {
  try {
    const member = await getGroomerSessionMember();
    if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const aadhaarFile = formData.get("aadhaarFile");
    const panFile = formData.get("panFile");

    const aadhaarImageUrl = await uploadDoc(aadhaarFile instanceof File ? aadhaarFile : null, `team-member-docs/${member.id}/aadhaar`);
    const panImageUrl = await uploadDoc(panFile instanceof File ? panFile : null, `team-member-docs/${member.id}/pan`);

    const beforeCompletionCount = [
      member.aadhaarNumber,
      member.panNumber,
      member.bankAccountName,
      member.bankAccountNumber,
      member.bankIfsc,
      member.upiId,
      member.emergencyContactName,
      member.emergencyContactPhone,
    ].filter((value) => !!String(value ?? "").trim()).length;

    const updated = await adminPrisma.teamMember.update({
      where: { id: member.id },
      data: {
        aadhaarNumber: String(formData.get("aadhaarNumber") ?? "").trim() || null,
        aadhaarImageUrl: aadhaarImageUrl ?? member.aadhaarImageUrl ?? null,
        panNumber: String(formData.get("panNumber") ?? "").trim() || null,
        panImageUrl: panImageUrl ?? member.panImageUrl ?? null,
        bankAccountName: String(formData.get("bankAccountName") ?? "").trim() || null,
        bankAccountNumber: String(formData.get("bankAccountNumber") ?? "").trim() || null,
        bankIfsc: String(formData.get("bankIfsc") ?? "").trim() || null,
        bankName: String(formData.get("bankName") ?? "").trim() || null,
        upiId: String(formData.get("upiId") ?? "").trim() || null,
        emergencyContactName: String(formData.get("emergencyContactName") ?? "").trim() || null,
        emergencyContactPhone: String(formData.get("emergencyContactPhone") ?? "").trim() || null,
        yearsExperience: formData.get("yearsExperience") ? Number(formData.get("yearsExperience")) : null,
        experienceNotes: String(formData.get("experienceNotes") ?? "").trim() || null,
      },
    });

    const afterCompletionCount = [
      updated.aadhaarNumber,
      updated.panNumber,
      updated.bankAccountName,
      updated.bankAccountNumber,
      updated.bankIfsc,
      updated.upiId,
      updated.emergencyContactName,
      updated.emergencyContactPhone,
    ].filter((value) => !!String(value ?? "").trim()).length;

    let rewardsDelta: Array<{ summary: string; xpAwarded: number; rewardPointsAwarded: number }> = [];
    if (beforeCompletionCount < 8 && afterCompletionCount === 8) {
      const result = await adminPrisma.$transaction(async (tx) => {
        const grant = await awardGroomerXp({
          tx,
          teamMemberId: member.id,
          eventType: "profile_completed",
          summary: "Profile aur documents poore kiye",
          xpAwarded: 40,
          rewardPointsAwarded: 20,
          trustDelta: 2,
          performanceDelta: 2,
        });
        return grant.reward ? [grant.reward] : [];
      });
      rewardsDelta = result;
    }

    return NextResponse.json({
      success: true,
      rewardsDelta,
      profile: {
        aadhaarNumber: updated.aadhaarNumber,
        aadhaarImageUrl: updated.aadhaarImageUrl,
        panNumber: updated.panNumber,
        panImageUrl: updated.panImageUrl,
        bankAccountName: updated.bankAccountName,
        bankAccountNumber: updated.bankAccountNumber,
        bankIfsc: updated.bankIfsc,
        bankName: updated.bankName,
        upiId: updated.upiId,
        emergencyContactName: updated.emergencyContactName,
        emergencyContactPhone: updated.emergencyContactPhone,
        yearsExperience: updated.yearsExperience,
        experienceNotes: updated.experienceNotes,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save profile" },
      { status: 500 }
    );
  }
}
