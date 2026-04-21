import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { adminPrisma } from "../../../../admin/_lib/bookingAdmin";
import { assertGroomerMemberAccess } from "../../../_lib/assertGroomerMemberAccess";
import { putBookingAsset } from "../../../../../../lib/storage/putBookingAsset";

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    const token = request.nextUrl.searchParams.get("token");
    const bookingId = request.nextUrl.searchParams.get("bookingId") ?? "";
    if (!bookingId) return NextResponse.json({ error: "bookingId is required" }, { status: 400 });

    const access = await assertGroomerMemberAccess({ bookingId, memberId, token });
    if (access.error) return access.error;

    const formData = await request.formData();
    const aadhaarFile = formData.get("aadhaarFile");
    const panFile = formData.get("panFile");

    const aadhaarImageUrl = await uploadDoc(aadhaarFile instanceof File ? aadhaarFile : null, `team-member-docs/${memberId}/aadhaar`);
    const panImageUrl = await uploadDoc(panFile instanceof File ? panFile : null, `team-member-docs/${memberId}/pan`);

    const updated = await adminPrisma.teamMember.update({
      where: { id: memberId },
      data: {
        aadhaarNumber: String(formData.get("aadhaarNumber") ?? "").trim() || null,
        aadhaarImageUrl: aadhaarImageUrl ?? access.member!.aadhaarImageUrl ?? null,
        panNumber: String(formData.get("panNumber") ?? "").trim() || null,
        panImageUrl: panImageUrl ?? access.member!.panImageUrl ?? null,
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

    return NextResponse.json({
      success: true,
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
