import { NextRequest, NextResponse } from "next/server";
import { adminPrisma } from "../../../admin/_lib/bookingAdmin";
import { assertGroomerMemberAccess } from "../../_lib/assertGroomerMemberAccess";
import { serializeGroomerHome } from "../../../../../lib/groomerHome";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    const token = request.nextUrl.searchParams.get("token");
    const bookingId = request.nextUrl.searchParams.get("bookingId") ?? "";

    if (!bookingId) {
      return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
    }

    const access = await assertGroomerMemberAccess({ bookingId, memberId, token });
    if (access.error) return access.error;

    const home = await serializeGroomerHome(adminPrisma, memberId);
    if (!home) return NextResponse.json({ error: "Groomer not found" }, { status: 404 });

    return NextResponse.json({ success: true, home });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load groomer home" },
      { status: 500 }
    );
  }
}
