import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { putBookingAsset } from "../../../../lib/storage/putBookingAsset";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image uploads are allowed" },
        { status: 400 }
      );
    }

    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Max allowed size is 8MB" },
        { status: 400 }
      );
    }

    const extension = file.name.split(".").pop() || "jpg";
    const storageKey = `companion-styling-references/${randomUUID()}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const uploaded = await putBookingAsset({
      storageKey,
      body: buffer,
      contentType: file.type,
    });

    return NextResponse.json({
      success: true,
      asset: {
        id: randomUUID(),
        storageKey,
        publicUrl: uploaded.publicUrl,
        originalName: file.name,
      },
    });
  } catch (error) {
    console.error("Companion styling reference upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload styling reference" },
      { status: 500 }
    );
  }
}