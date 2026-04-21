import { NextResponse } from "next/server";
import { assertAdminSession } from "../../../_lib/assertAdmin";
import { adminPrisma, logAdminBookingEvent } from "../../../_lib/bookingAdmin";
import {
  getAddressReadinessSummary,
  normalizeOptionalText,
  normalizePincode,
} from "../../../../../../lib/booking/addressCapture";

export const runtime = "nodejs";

const ALLOWED_SOURCES = new Set([
  "website",
  "call",
  "instagram_dm",
  "whatsapp",
  "manual_internal",
]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const { id: bookingId } = await params;
    const body = await request.json().catch(() => ({}));
    const bookingSource =
      typeof body.bookingSource === "string" ? body.bookingSource.trim() : "";
    const adminNote = normalizeOptionalText(body.adminNote);
    const serviceAddress = normalizeOptionalText(body.serviceAddress);
    const serviceLandmark = normalizeOptionalText(body.serviceLandmark);
    const servicePincode = normalizePincode(body.servicePincode);
    const serviceLocationUrl = normalizeOptionalText(body.serviceLocationUrl);

    if (!ALLOWED_SOURCES.has(bookingSource)) {
      return NextResponse.json({ error: "Invalid booking source" }, { status: 400 });
    }

    const booking = await adminPrisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const previousAddressStatus = getAddressReadinessSummary(booking);
    const nextAddressStatus = getAddressReadinessSummary({
      serviceAddress,
      serviceLandmark,
      servicePincode,
      serviceLocationUrl,
    });

    const sourceChanged = booking.bookingSource !== bookingSource;
    const noteChanged = booking.adminNote !== adminNote;
    const addressChanged =
      booking.serviceAddress !== serviceAddress ||
      booking.serviceLandmark !== serviceLandmark ||
      booking.servicePincode !== servicePincode ||
      booking.serviceLocationUrl !== serviceLocationUrl;

    await adminPrisma.booking.update({
      where: { id: bookingId },
      data: {
        bookingSource,
        adminNote,
        serviceAddress,
        serviceLandmark,
        servicePincode,
        serviceLocationUrl,
        addressUpdatedAt: addressChanged ? new Date() : booking.addressUpdatedAt,
      },
    });

    if (sourceChanged || noteChanged || addressChanged) {
      const summaryParts: string[] = [];
      if (sourceChanged) {
        summaryParts.push(`Source updated to ${bookingSource.replace(/_/g, " ")}`);
      }
      if (addressChanged) {
        summaryParts.push(nextAddressStatus.statusLabel);
      }
      if (noteChanged) {
        summaryParts.push("Ops note updated");
      }

      await logAdminBookingEvent({
        bookingId,
        type: "booking_metadata_updated",
        summary: summaryParts.join(" · ") || "Booking metadata updated",
        metadata: {
          previousSource: booking.bookingSource,
          nextSource: bookingSource,
          noteUpdated: noteChanged,
          previousAddressStatus: previousAddressStatus.status,
          nextAddressStatus: nextAddressStatus.status,
          addressChanged,
        },
      });
    }

    return NextResponse.json({
      success: true,
      bookingId,
      bookingSource,
      adminNote,
      addressInfo: {
        ...nextAddressStatus,
        serviceAddress,
        serviceLandmark,
        servicePincode,
        serviceLocationUrl,
        addressUpdatedAt: addressChanged
          ? new Date().toISOString()
          : booking.addressUpdatedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    console.error("PATCH /api/admin/bookings/:id/metadata failed", error);
    return NextResponse.json({ error: "Failed to update booking metadata" }, { status: 500 });
  }
}
