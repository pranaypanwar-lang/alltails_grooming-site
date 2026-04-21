import { NextResponse } from "next/server";
import { getGroomerSessionMember } from "../../../../lib/auth/groomerSession";
import { serializeGroomerHome } from "../../../../lib/groomerHome";
import { adminPrisma } from "../../admin/_lib/bookingAdmin";

export const runtime = "nodejs";

export async function GET() {
  try {
    const member = await getGroomerSessionMember();
    if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const home = await serializeGroomerHome(adminPrisma, member.id);
    if (!home) return NextResponse.json({ error: "Groomer not found" }, { status: 404 });

    return NextResponse.json({ success: true, home });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load groomer dashboard" },
      { status: 500 }
    );
  }
}
