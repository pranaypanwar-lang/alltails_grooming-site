import { notFound } from "next/navigation";
import { GroomerJobClient } from "../../jobs/[id]/GroomerJobClient";
import { getSopStepsForService } from "../../../../lib/booking/sop";
import type { GroomerBookingView } from "../../../../lib/groomerPortal";

const TIER_MAP = {
  essential: "Essential Care",
  signature: "Signature Care",
  complete: "Complete Pampering",
} as const;

type TierSlug = keyof typeof TIER_MAP;

function buildPreviewBooking(serviceName: string): GroomerBookingView {
  const sopSteps = getSopStepsForService(serviceName).map((def) => ({
    key: def.key,
    label: def.label,
    groomerLabel: def.groomerLabel,
    groomerLabelHindi: def.groomerLabelHindi,
    groomerHint: def.groomerHint ?? null,
    groomerHintHindi: def.groomerHintHindi ?? null,
    proofType: def.proofType,
    requiredForCompletion: def.requiredForCompletion,
    status: "pending" as const,
    completedAt: null,
    groomerNote: def.key === "bath_dry_proof"
      ? "Use oatmeal shampoo for sensitive belly. Avoid regular shampoo — Bruno had a reaction last time."
      : def.key === "final_groom_proof"
      ? "Scissors ONLY on face — no clippers near ears or muzzle. Owner was very specific."
      : null,
    proofs: [],
  }));

  return {
    id: "preview-booking",
    status: "confirmed",
    dispatchState: "assigned",
    enRouteLat: null,
    enRouteLng: null,
    selectedDate: new Date().toISOString().slice(0, 10),
    opsNote: "Customer prefers only scissors on face. Dog is nervous with clippers.",
    service: {
      id: "preview-service",
      name: serviceName,
      sla: { durationMinutes: 90, label: "~90 min" },
    },
    customer: {
      name: "Priya Sharma",
      phone: "9876543210",
      city: "Delhi",
    },
    team: { id: "preview-team", name: "Team Alpha" },
    groomerMember: {
      id: "preview-groomer",
      name: "Ravi Kumar",
      role: "groomer",
      currentRank: "Silver",
      currentXp: 1240,
    },
    availableTeamMembers: [
      { id: "preview-groomer", name: "Ravi Kumar", role: "groomer", currentRank: "Silver", currentXp: 1240 },
    ],
    bookingWindow: (() => {
      const today = new Date();
      const startAt = new Date(today);
      startAt.setHours(10, 0, 0, 0);
      const endAt = new Date(today);
      endAt.setHours(12, 0, 0, 0);
      return {
        startTime: startAt.toISOString(),
        endTime: endAt.toISOString(),
        label: "10:00 AM – 12:00 PM",
      };
    })(),
    addressInfo: {
      status: "complete" as const,
      statusLabel: "Address ready",
      addressReceived: true,
      landmarkReceived: true,
      pincodeReceived: true,
      locationReceived: false,
      coordinatesReceived: false,
      serviceAddress: "B-42, Vasant Kunj",
      serviceLandmark: "Near DPS School",
      servicePincode: "110070",
      serviceLocationUrl: null,
    },
    pets: [
      {
        id: "preview-pet",
        name: "Bruno",
        breed: "Golden Retriever",
        avatarUrl: null,
        groomingNotes: "Mild skin sensitivity on the belly — use gentle shampoo.",
        stylingNotes: "Trim feathers only, do not shave coat.",
        temperament: "wiggle_worrier",
        stylingReferenceUrls: [],
        concernPhotoUrls: [],
      },
    ],
    payment: {
      method: "pay_after_service",
      status: "unpaid",
      finalAmount: serviceName === "Essential Care" ? 999 : serviceName === "Signature Care" ? 1299 : 1799,
      collection: null,
    },
    sopSteps,
    customerMessages: [],
    rewardSummary: null,
  };
}

export default async function GroomerPreviewPage({
  params,
}: {
  params: Promise<{ tier: string }>;
}) {
  const { tier } = await params;

  if (!(tier in TIER_MAP)) notFound();

  const serviceName = TIER_MAP[tier as TierSlug];
  const mockBooking = buildPreviewBooking(serviceName);

  return (
    <div>
      <div className="sticky top-0 z-50 flex items-center gap-3 bg-amber-400 px-4 py-2 text-[13px] font-bold text-amber-900">
        <span>⚠ PREVIEW MODE — {serviceName}</span>
        <div className="ml-auto flex gap-3">
          <a href="/groomer/preview/essential" className="underline">Essential</a>
          <a href="/groomer/preview/signature" className="underline">Signature</a>
          <a href="/groomer/preview/complete" className="underline">Complete</a>
        </div>
      </div>
      <GroomerJobClient initialBooking={mockBooking} token={undefined} isPreview />
    </div>
  );
}
