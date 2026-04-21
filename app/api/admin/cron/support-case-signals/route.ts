import { NextResponse } from "next/server";
import { adminPrisma, logAdminBookingEvent } from "../../_lib/bookingAdmin";
import { scanAutomatedSupportSignals } from "../../../../../lib/supportCases/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await scanAutomatedSupportSignals(adminPrisma);

    for (const entry of result.results) {
      if (!entry.created) continue;
      await logAdminBookingEvent({
        bookingId: entry.bookingId,
        type: "support_case_opened",
        summary: `${entry.category.replace(/_/g, " ")} case opened automatically`,
        metadata: {
          category: entry.category,
          source: "system",
        },
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to scan support signals" },
      { status: 500 }
    );
  }
}
