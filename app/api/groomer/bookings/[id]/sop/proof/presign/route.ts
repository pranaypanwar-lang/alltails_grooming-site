import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { assertGroomerAccess } from "../../../../../_lib/assertGroomerAccess";
import { isBookingSopStepKey } from "../../../../../../../../lib/booking/sop";
import { presignPutUrl } from "../../../../../../../../lib/storage/presignUpload";
import { getStorageProvider } from "../../../../../../../../lib/storage/config";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set([
  "image/jpeg", "image/jpg", "image/png", "image/webp",
  "image/heic", "image/heif",
  "video/mp4", "video/webm", "video/quicktime",
]);

function extFromMime(mime: string) {
  const map: Record<string, string> = {
    "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png",
    "image/webp": "webp", "image/heic": "heic", "image/heif": "heif",
    "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov",
  };
  return map[mime] ?? "bin";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const token = request.nextUrl.searchParams.get("token");
    const access = await assertGroomerAccess(bookingId, token);
    if (access.error) return access.error;

    // Presigned uploads only available with S3/Supabase storage
    const provider = getStorageProvider();
    if (provider === "local") {
      return NextResponse.json({ error: "presign_not_supported" }, { status: 400 });
    }

    const stepKey = request.nextUrl.searchParams.get("stepKey") ?? "";
    const mimeType = request.nextUrl.searchParams.get("mimeType") ?? "";

    if (!isBookingSopStepKey(stepKey)) {
      return NextResponse.json({ error: "Invalid SOP step" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(mimeType)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    const ext = extFromMime(mimeType);
    const storageKey = `booking-sop/${stepKey}/${bookingId}/${randomUUID()}.${ext}`;
    const { uploadUrl, publicUrl } = await presignPutUrl({ storageKey, contentType: mimeType });

    return NextResponse.json({ uploadUrl, storageKey, publicUrl });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
