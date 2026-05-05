import { NextResponse } from "next/server";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../lib/generated/prisma";
import {
  assertBookingAccessToken,
  bookingAccessMatchesPhone,
} from "../_lib/assertBookingAccess";
import {
  getAddressReadinessSummary,
  extractCoordinatesFromLocationUrl,
  makeGoogleMapsUrl,
  normalizeLatitude,
  normalizeLongitude,
  normalizeOptionalText,
  normalizePincode,
} from "../../../../lib/booking/addressCapture";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function normalizeLocationUrl(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed;
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const bookingId = typeof body.bookingId === "string" ? body.bookingId.trim() : "";
    const accessToken = typeof body.accessToken === "string" ? body.accessToken : "";

    if (!bookingId || !accessToken) {
      return NextResponse.json({ error: "bookingId and accessToken are required" }, { status: 400 });
    }

    const access = assertBookingAccessToken(bookingId, accessToken);
    if (access instanceof NextResponse) return access;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { user: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (!bookingAccessMatchesPhone(booking.user.phone, access.phone)) {
      return NextResponse.json({ error: "Booking access does not match this booking" }, { status: 403 });
    }

    const serviceAddress = normalizeOptionalText(body.serviceAddress);
    const serviceLandmark = normalizeOptionalText(body.serviceLandmark);
    const servicePincode = normalizePincode(body.servicePincode);
    const submittedLocationUrl = normalizeLocationUrl(body.serviceLocationUrl);
    const extractedCoordinates = extractCoordinatesFromLocationUrl(submittedLocationUrl);
    const serviceLat = normalizeLatitude(body.serviceLat) ?? extractedCoordinates?.lat ?? null;
    const serviceLng = normalizeLongitude(body.serviceLng) ?? extractedCoordinates?.lng ?? null;
    const hasCoordinates = serviceLat !== null && serviceLng !== null;
    const serviceLocationUrl = submittedLocationUrl ?? (hasCoordinates ? makeGoogleMapsUrl(serviceLat, serviceLng) : null);
    const serviceLocationSource =
      typeof body.serviceLocationSource === "string" && body.serviceLocationSource.trim()
        ? body.serviceLocationSource.trim()
        : hasCoordinates && !extractedCoordinates
          ? "browser_geolocation"
          : extractedCoordinates
            ? "google_maps_url"
          : null;

    if (!serviceAddress || !serviceLandmark || (!servicePincode && !hasCoordinates)) {
      return NextResponse.json(
        { error: "Full address, landmark, and either pin code or current location are required" },
        { status: 400 }
      );
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        serviceAddress,
        serviceLandmark,
        servicePincode,
        serviceLocationUrl,
        serviceLat,
        serviceLng,
        serviceLocationSource,
        addressUpdatedAt: new Date(),
      },
    });

    const summary = getAddressReadinessSummary(updated);

    return NextResponse.json({
      success: true,
      bookingId,
      addressInfo: {
        serviceAddress: updated.serviceAddress,
        serviceLandmark: updated.serviceLandmark,
        servicePincode: updated.servicePincode,
        serviceLocationUrl: updated.serviceLocationUrl,
        serviceLat: updated.serviceLat,
        serviceLng: updated.serviceLng,
        serviceLocationSource: updated.serviceLocationSource,
        addressUpdatedAt: updated.addressUpdatedAt?.toISOString() ?? null,
        ...summary,
      },
    });
  } catch (error) {
    console.error("PATCH /api/booking/address failed", error);
    return NextResponse.json({ error: "Failed to save booking address" }, { status: 500 });
  }
}
