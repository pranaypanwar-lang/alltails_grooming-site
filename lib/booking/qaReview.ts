export type BookingQaStatus = "not_started" | "in_progress" | "complete" | "issue";

export type BookingQaReviewEvent = {
  type: string;
  actor: string | null;
  metadataJson?: string | null;
  createdAt: Date;
};

export type BookingQaReviewSummary = {
  status: BookingQaStatus;
  label: string;
  notes: string | null;
  reviewedAt: string;
  reviewedBy: string | null;
  completedWithoutProof: boolean;
  completedBooking: boolean;
};

const QA_LABELS: Record<BookingQaStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  complete: "Complete",
  issue: "Issue",
};

function parseMetadata(metadataJson?: string | null) {
  if (!metadataJson) return null;
  try {
    const parsed = JSON.parse(metadataJson);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function getBookingQaLabel(status: BookingQaStatus) {
  return QA_LABELS[status];
}

export function getLatestQaReview(events: BookingQaReviewEvent[]): BookingQaReviewSummary | null {
  const latestEvent = [...events]
    .filter((event) => event.type === "qa_review_updated")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

  if (!latestEvent) return null;

  const metadata = parseMetadata(latestEvent.metadataJson);
  const statusValue =
    metadata?.qaStatus === "complete" ||
    metadata?.qaStatus === "issue" ||
    metadata?.qaStatus === "in_progress"
      ? (metadata.qaStatus as Exclude<BookingQaStatus, "not_started">)
      : "in_progress";

  return {
    status: statusValue,
    label: getBookingQaLabel(statusValue),
    notes: typeof metadata?.notes === "string" ? metadata.notes : null,
    reviewedAt: latestEvent.createdAt.toISOString(),
    reviewedBy: latestEvent.actor,
    completedWithoutProof: metadata?.completedWithoutProof === true,
    completedBooking: metadata?.completedBooking === true,
  };
}
