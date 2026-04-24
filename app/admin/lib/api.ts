import type {
  AdminBookingDetailResponse,
  AdminBookingsFilters,
  AdminBookingsResponse,
  AdminDispatchFilters,
  AdminDispatchResponse,
  AdminCompleteBookingResponse,
  AdminCancelBookingResponse,
  AdminAssignTeamResponse,
  AdminAssignGroomerResponse,
  AdminRescheduleBookingResponse,
  AdminRetryPaymentSupportResponse,
  AdminRelayCallResponse,
  AdminDispatchStateResponse,
  AdminBookingMetadataResponse,
  AdminPaymentLinkResponse,
  AdminCustomerMessageResponse,
  AdminBookingCreateMetaResponse,
  AdminSavedPetsResponse,
  AdminManualBookingPayload,
  AdminManualBookingResponse,
  AdminDigestHistoryResponse,
  AdminDispatchAlertHistoryResponse,
  AdminBookingSopUpdateResponse,
  AdminBookingSopProofUploadResponse,
  AdminBookingPaymentCollectionResponse,
  AdminBookingQaReviewResponse,
  AdminCouponListResponse,
  AdminCouponMutationResponse,
  AdminCouponPayload,
  AdminQaFilters,
  AdminQaResponse,
  AdminCustomerMessagesFilters,
  AdminCustomerMessagesResponse,
  AdminCustomerMessageStatusResponse,
  AdminCustomerMessageQueueProcessResponse,
  AdminCampaignPrepareResponse,
  AdminSupportFilters,
  AdminSupportResponse,
  AdminSupportCaseResponse,
  AdminSupportSignalScanResponse,
  AdminWorkforceResponse,
  AdminWorkforceAdjustmentResponse,
  AdminWorkforceMutationResponse,
} from "../types";

function toQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "" || value === false) continue;
    qs.set(key, String(value));
  }
  return qs.toString();
}

function getApiErrorMessage(value: unknown, fallback: string) {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  ) {
    return value.error;
  }

  return fallback;
}

export async function fetchAdminBookings(params: {
  filters: AdminBookingsFilters;
  page: number;
  pageSize: number;
}): Promise<AdminBookingsResponse> {
  const { filters, page, pageSize } = params;

  const resolved = {
    page,
    pageSize,
    tab: filters.tab,
    search: filters.search.trim(),
    date: filters.date,
    dateFrom: filters.date ? "" : filters.dateFrom,
    dateTo: filters.date ? "" : filters.dateTo,
    city: filters.city,
    teamId: filters.teamId,
    bookingStatus: filters.bookingStatus,
    paymentStatus: filters.paymentStatus,
    loyaltyState: filters.loyaltyState,
    serviceName: filters.serviceName,
    sameDayOnly: filters.sameDayOnly,
    needsAssignment: filters.needsAssignment,
    paymentExpiringSoon: filters.paymentExpiringSoon,
    tomorrowOnly: filters.tomorrowOnly,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  };

  const res = await fetch(`/api/admin/bookings?${toQueryString(resolved)}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load bookings");
  return res.json();
}

export async function fetchAdminBookingDetail(bookingId: string): Promise<AdminBookingDetailResponse> {
  const res = await fetch(`/api/admin/bookings/${bookingId}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load booking details");
  return res.json();
}

export async function fetchAdminBookingCreateMeta(): Promise<AdminBookingCreateMetaResponse> {
  const res = await fetch("/api/admin/bookings/create/meta", { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to load booking options");
  return data;
}

export async function fetchAdminCoupons(): Promise<AdminCouponListResponse> {
  const res = await fetch("/api/admin/coupons", { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(getApiErrorMessage(data, "Failed to load coupons"));
  return data;
}

export async function createAdminCoupon(
  payload: AdminCouponPayload
): Promise<AdminCouponMutationResponse> {
  const res = await fetch("/api/admin/coupons", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(getApiErrorMessage(data, "Failed to create coupon"));
  return data;
}

export async function updateAdminCoupon(
  couponId: string,
  payload: AdminCouponPayload
): Promise<AdminCouponMutationResponse> {
  const res = await fetch(`/api/admin/coupons/${couponId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(getApiErrorMessage(data, "Failed to update coupon"));
  return data;
}

export async function fetchAdminSavedPetsByPhone(phone: string): Promise<AdminSavedPetsResponse> {
  const qs = new URLSearchParams({ phone });
  const res = await fetch(`/api/pets/by-phone?${qs.toString()}`, { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to load saved pets");
  return data;
}

export async function createAdminManualBooking(
  payload: AdminManualBookingPayload
): Promise<AdminManualBookingResponse> {
  const res = await fetch("/api/admin/bookings/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to create booking");
  return data;
}

export async function fetchAdminDispatch(filters: AdminDispatchFilters): Promise<AdminDispatchResponse> {
  const res = await fetch(`/api/admin/dispatch?${toQueryString({
    date: filters.date,
    city: filters.city,
    includeCompleted: filters.includeCompleted,
    addressPendingOnly: filters.addressPendingOnly,
  })}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load dispatch board");
  return res.json();
}

export async function fetchAdminQa(filters: AdminQaFilters): Promise<AdminQaResponse> {
  const res = await fetch(`/api/admin/qa?${toQueryString({
    search: filters.search.trim(),
    teamId: filters.teamId,
    date: filters.date,
    qaStatus: filters.qaStatus,
    mismatchOnly: filters.mismatchOnly,
  })}`, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(getApiErrorMessage(data, "Failed to load QA board"));
  return data;
}

export async function fetchAdminCustomerMessages(
  filters: AdminCustomerMessagesFilters
): Promise<AdminCustomerMessagesResponse> {
  const res = await fetch(
    `/api/admin/customer-messages?${toQueryString({
      search: filters.search.trim(),
      messageType: filters.messageType,
      status: filters.status,
      date: filters.date,
    })}`,
    { cache: "no-store" }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(getApiErrorMessage(data, "Failed to load customer messages"));
  return data;
}

export async function updateAdminCustomerMessageStatus(
  messageId: string,
  payload: {
    status: "prepared" | "queued" | "sent" | "failed";
    providerRef?: string;
    errorMsg?: string;
  }
): Promise<AdminCustomerMessageStatusResponse> {
  const res = await fetch(`/api/admin/customer-messages/${messageId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(getApiErrorMessage(data, "Failed to update customer message"));
  return data;
}

export async function processAdminCustomerMessageQueue(): Promise<AdminCustomerMessageQueueProcessResponse> {
  const res = await fetch("/api/admin/customer-messages/process-queue", {
    method: "POST",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(getApiErrorMessage(data, "Failed to process customer message queue"));
  return data;
}

export async function prepareAdminCampaign(payload: {
  messageType: "periodic_care_tip" | "custom_offer";
  city?: string;
  customText?: string;
  offerCode?: string;
  limit?: number;
}): Promise<AdminCampaignPrepareResponse> {
  const res = await fetch("/api/admin/customer-messages/campaign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(getApiErrorMessage(data, "Failed to prepare campaign"));
  return data;
}

export async function fetchAdminSupportCases(
  filters: AdminSupportFilters
): Promise<AdminSupportResponse> {
  const res = await fetch(
    `/api/admin/support-cases?${toQueryString({
      search: filters.search.trim(),
      category: filters.category,
      status: filters.status,
      priority: filters.priority,
      date: filters.date,
    })}`,
    { cache: "no-store" }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(getApiErrorMessage(data, "Failed to load support cases"));
  return data;
}

export async function createAdminSupportCase(payload: {
  bookingId?: string | null;
  category: string;
  status?: string;
  priority: string;
  summary: string;
  details?: string;
  customerName?: string;
  customerPhone?: string;
  city?: string;
}): Promise<AdminSupportCaseResponse> {
  const res = await fetch("/api/admin/support-cases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(getApiErrorMessage(data, "Failed to create support case"));
  return data;
}

export async function updateAdminSupportCase(
  caseId: string,
  payload: { status?: string; priority?: string; resolution?: string }
): Promise<AdminSupportCaseResponse> {
  const res = await fetch(`/api/admin/support-cases/${caseId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(getApiErrorMessage(data, "Failed to update support case"));
  return data;
}

export async function scanAdminSupportSignals(): Promise<AdminSupportSignalScanResponse> {
  const res = await fetch("/api/admin/support-cases/scan-signals", {
    method: "POST",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(getApiErrorMessage(data, "Failed to scan support signals"));
  return data;
}

export async function completeAdminBooking(
  bookingId: string,
  options?: { allowMissingRequiredSteps?: boolean }
): Promise<AdminCompleteBookingResponse> {
  const res = await fetch(`/api/admin/bookings/${bookingId}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      allowMissingRequiredSteps: options?.allowMissingRequiredSteps === true,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(getApiErrorMessage(data, "Failed to complete booking"));
  }
  return res.json();
}

export async function updateAdminBookingQaReview(
  bookingId: string,
  payload: {
    qaStatus: "in_progress" | "complete" | "issue";
    notes?: string;
    completeBooking?: boolean;
    allowMissingRequiredSteps?: boolean;
  }
): Promise<AdminBookingQaReviewResponse> {
  const res = await fetch(`/api/admin/bookings/${bookingId}/qa-review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(getApiErrorMessage(data, "Failed to update QA review"));
  return data;
}

export async function cancelAdminBooking(bookingId: string, reason?: string): Promise<AdminCancelBookingResponse> {
  const res = await fetch(`/api/admin/bookings/${bookingId}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason: reason ?? null }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(getApiErrorMessage(data, "Failed to cancel booking"));
  }
  return res.json();
}

export type PaidCancelPayload = {
  refundMode: "manual_refund" | "razorpay_refund" | "waived";
  reason: string;
  refundNotes?: string;
};

export async function cancelPaidAdminBooking(bookingId: string, payload: PaidCancelPayload) {
  const res = await fetch(`/api/admin/bookings/${bookingId}/cancel-paid`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(getApiErrorMessage(data, "Failed to cancel paid booking"));
  return data;
}

export async function assignAdminBookingTeam(bookingId: string, teamId: string): Promise<AdminAssignTeamResponse> {
  const res = await fetch(`/api/admin/bookings/${bookingId}/assign-team`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teamId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to assign team");
  return data;
}

export async function assignAdminBookingGroomer(
  bookingId: string,
  teamMemberId: string
): Promise<AdminAssignGroomerResponse> {
  const res = await fetch(`/api/admin/bookings/${bookingId}/assign-groomer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teamMemberId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(getApiErrorMessage(data, "Failed to assign groomer"));
  return data;
}

export async function rescheduleAdminBooking(bookingId: string, slotIds: string[]): Promise<AdminRescheduleBookingResponse> {
  const res = await fetch(`/api/admin/bookings/${bookingId}/reschedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slotIds }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to reschedule booking");
  return data;
}

export async function retryAdminPaymentSupport(bookingId: string): Promise<AdminRetryPaymentSupportResponse> {
  const res = await fetch(`/api/admin/bookings/${bookingId}/retry-payment-support`, { method: "POST" });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to create retry payment order");
  return data;
}

export async function generateAdminPaymentLink(bookingId: string): Promise<AdminPaymentLinkResponse> {
  const res = await fetch(`/api/admin/bookings/${bookingId}/payment-link`, { method: "POST" });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to generate payment link");
  return data;
}

export async function updateAdminDispatchState(
  bookingId: string,
  dispatchState: "assigned" | "en_route" | "started" | "issue"
): Promise<AdminDispatchStateResponse> {
  const res = await fetch(`/api/admin/bookings/${bookingId}/dispatch-state`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dispatchState }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to update dispatch state");
  return data;
}

export async function updateAdminBookingSopStep(
  bookingId: string,
  payload: { stepKey: string; status: "pending" | "completed"; notes?: string }
): Promise<AdminBookingSopUpdateResponse> {
  const res = await fetch(`/api/admin/bookings/${bookingId}/sop/step`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(getApiErrorMessage(data, "Failed to update SOP step"));
  return data;
}

export async function uploadAdminBookingSopProof(
  bookingId: string,
  payload: { stepKey: string; file: File }
): Promise<AdminBookingSopProofUploadResponse> {
  const formData = new FormData();
  formData.set("stepKey", payload.stepKey);
  formData.set("file", payload.file);

  const res = await fetch(`/api/admin/bookings/${bookingId}/sop/proof`, {
    method: "POST",
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(getApiErrorMessage(data, "Failed to upload SOP proof"));
  return data;
}

export async function recordAdminBookingPaymentProof(
  bookingId: string,
  payload: {
    collectionMode: "cash" | "online" | "waived";
    collectedAmount: number;
    notes?: string;
    applyServiceAmountChange?: boolean;
  }
): Promise<AdminBookingPaymentCollectionResponse> {
  const res = await fetch(`/api/admin/bookings/${bookingId}/sop/payment-proof`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(getApiErrorMessage(data, "Failed to record payment proof"));
  return data;
}

export async function updateAdminBookingMetadata(
  bookingId: string,
  payload: {
    bookingSource: string;
    adminNote?: string;
    serviceAddress?: string;
    serviceLandmark?: string;
    servicePincode?: string;
    serviceLocationUrl?: string;
    pets?: Array<{
      bookingPetId: string;
      stylingAssets: Array<{
        storageKey: string;
        publicUrl: string;
        originalName: string;
      }>;
      concernAssets: Array<{
        storageKey: string;
        publicUrl: string;
        originalName: string;
      }>;
    }>;
  }
): Promise<AdminBookingMetadataResponse> {
  const res = await fetch(`/api/admin/bookings/${bookingId}/metadata`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to update booking metadata");
  return data;
}

export async function logAdminRelayCall(bookingId: string, payload?: { teamId?: string; outcome?: string }): Promise<AdminRelayCallResponse> {
  const res = await fetch(`/api/admin/bookings/${bookingId}/relay-call`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload ?? {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to log relay call");
  return data;
}

export async function prepareAdminCustomerMessage(
  bookingId: string,
  payload: {
    messageType:
      | "booking_confirmation"
      | "team_on_the_way"
      | "night_before_reminder"
      | "post_groom_care"
      | "review_request";
  }
): Promise<AdminCustomerMessageResponse> {
  const res = await fetch(`/api/admin/bookings/${bookingId}/customer-message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(getApiErrorMessage(data, "Failed to prepare customer message"));
  return data;
}

export async function previewDigest(date: string) {
  const res = await fetch("/api/admin/dispatch/digest/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date }),
  });
  if (!res.ok) throw new Error("Failed to generate digest");
  return res.json();
}

export type DigestSendResult = {
  date: string;
  results: Array<{ teamId: string; teamName: string; success: boolean; error?: string }>;
};

export async function sendDigest(date: string): Promise<DigestSendResult> {
  const res = await fetch("/api/admin/dispatch/digest/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Failed to send digest");
  return data;
}

export async function fetchDigestHistory(params?: {
  date?: string;
  limit?: number;
}): Promise<AdminDigestHistoryResponse> {
  const qs = new URLSearchParams();
  if (params?.date) qs.set("date", params.date);
  if (params?.limit) qs.set("limit", String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await fetch(`/api/admin/dispatch/digest/history${suffix}`, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Failed to load digest history");
  return data;
}

export async function fetchDispatchAlertHistory(params?: {
  date?: string;
  limit?: number;
  alertType?: string;
}): Promise<AdminDispatchAlertHistoryResponse> {
  const qs = new URLSearchParams();
  if (params?.date) qs.set("date", params.date);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.alertType) qs.set("alertType", params.alertType);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await fetch(`/api/admin/dispatch/alerts/history${suffix}`, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Failed to load alert history");
  return data;
}

// ─── Teams ────────────────────────────────────────────────────────────────────

export type AdminTeamRow = {
  id: string;
  name: string;
  isActive?: boolean;
  telegramChatId: string | null;
  telegramAlertsEnabled: boolean;
  opsLeadName: string | null;
  opsLeadPhone: string | null;
  activeSlotCount?: number | null;
  assignedBookingCount?: number | null;
  members?: Array<{
    id: string;
    name: string;
    phone: string | null;
    role: string;
    isActive: boolean;
    currentXp: number;
    rewardPoints: number;
    trustScore: number;
    performanceScore: number;
    currentLevel: number;
    currentRank: string;
    salaryHikeStage: number;
    completedCount: number;
    onTimeCount: number;
    reviewCount: number;
    punctualityStreak: number;
    reviewStreak: number;
    noLeaveStreakDays: number;
  }>;
  coverageRules?: Array<{
    id: string;
    weekday: number;
    coverageType: string;
    isActive: boolean;
    areas: Array<{
      serviceAreaId: string;
      name: string;
      slug: string;
    }>;
  }>;
};

export type AdminTeamsResponse = { teams: AdminTeamRow[] };
export type AdminServiceArea = { id: string; name: string; slug: string; isActive: boolean };
export type AdminServiceAreasResponse = { serviceAreas: AdminServiceArea[] };

export async function fetchAdminTeams(): Promise<AdminTeamsResponse> {
  const res = await fetch("/api/admin/teams", { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error("Failed to load teams");
  return data;
}

export async function updateAdminTeam(
  teamId: string,
  payload: {
    name?: string;
    isActive?: boolean;
    telegramChatId?: string | null;
    telegramAlertsEnabled?: boolean;
    opsLeadName?: string | null;
    opsLeadPhone?: string | null;
  }
) {
  const res = await fetch(`/api/admin/teams/${teamId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to update team");
  return data;
}

export async function createAdminTeamMember(
  teamId: string,
  payload: {
    name: string;
    phone?: string | null;
    password?: string | null;
    role?: string;
    isActive?: boolean;
  }
) {
  const res = await fetch(`/api/admin/teams/${teamId}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Failed to create team member");
  return data;
}

export async function updateAdminTeamMember(
  teamId: string,
  payload: {
    memberId: string;
    name?: string;
    phone?: string | null;
    password?: string | null;
    role?: string;
    isActive?: boolean;
  }
) {
  const res = await fetch(`/api/admin/teams/${teamId}/members`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Failed to update team member");
  return data;
}

export async function fetchAdminWorkforce(): Promise<AdminWorkforceResponse> {
  const res = await fetch("/api/admin/workforce", { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(getApiErrorMessage(data, "Failed to load workforce"));
  return data;
}

export async function createAdminWorkforceAdjustment(payload: {
  teamMemberId: string;
  mode: "reward" | "penalty";
  summary: string;
  xpAwarded: number;
  rewardPointsAwarded: number;
  trustDelta: number;
  performanceDelta: number;
  cashAmount?: number;
  notes?: string;
}): Promise<AdminWorkforceAdjustmentResponse> {
  const res = await fetch("/api/admin/workforce/adjustments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(getApiErrorMessage(data, "Failed to create workforce adjustment"));
  return data;
}

export async function createAdminLeaveRequest(payload: {
  teamMemberId: string;
  leaveType: string;
  emergencyFlag?: boolean;
  startDate: string;
  endDate: string;
  reason: string;
}): Promise<AdminWorkforceMutationResponse> {
  const res = await fetch("/api/admin/workforce/leave-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(getApiErrorMessage(data, "Failed to create leave request"));
  return data;
}

export async function updateAdminLeaveRequest(
  requestId: string,
  payload: { status: string; reviewNote?: string }
): Promise<AdminWorkforceMutationResponse> {
  const res = await fetch(`/api/admin/workforce/leave-requests/${requestId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(getApiErrorMessage(data, "Failed to update leave request"));
  return data;
}

export async function createAdminSalaryAdvanceRequest(payload: {
  teamMemberId: string;
  amount: number;
  reason: string;
}): Promise<AdminWorkforceMutationResponse> {
  const res = await fetch("/api/admin/workforce/salary-advance-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(getApiErrorMessage(data, "Failed to create salary advance request"));
  return data;
}

export async function updateAdminSalaryAdvanceRequest(
  requestId: string,
  payload: { status: string; reviewNote?: string }
): Promise<AdminWorkforceMutationResponse> {
  const res = await fetch(`/api/admin/workforce/salary-advance-requests/${requestId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(getApiErrorMessage(data, "Failed to update salary advance request"));
  return data;
}

export async function createAdminReferralRecord(payload: {
  referrerMemberId: string;
  candidateName: string;
  candidatePhone?: string;
  role?: string;
  notes?: string;
}): Promise<AdminWorkforceMutationResponse> {
  const res = await fetch("/api/admin/workforce/referrals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(getApiErrorMessage(data, "Failed to create referral record"));
  return data;
}

export async function updateAdminReferralRecord(
  referralId: string,
  payload: { status: string; notes?: string }
): Promise<AdminWorkforceMutationResponse> {
  const res = await fetch(`/api/admin/workforce/referrals/${referralId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(getApiErrorMessage(data, "Failed to update referral record"));
  return data;
}

export async function createAdminTrainingModule(payload: {
  title: string;
  category: string;
  description?: string;
  xpReward?: number;
  rewardPointsReward?: number;
}): Promise<AdminWorkforceMutationResponse> {
  const res = await fetch("/api/admin/workforce/training-modules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(getApiErrorMessage(data, "Failed to create training module"));
  return data;
}

export async function updateAdminTrainingModule(
  moduleId: string,
  payload: { title?: string; category?: string; description?: string; xpReward?: number; rewardPointsReward?: number; isActive?: boolean }
): Promise<AdminWorkforceMutationResponse> {
  const res = await fetch(`/api/admin/workforce/training-modules/${moduleId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(getApiErrorMessage(data, "Failed to update training module"));
  return data;
}

export async function createAdminTrainingCompletion(payload: {
  moduleId: string;
  teamMemberId: string;
  score?: number;
  notes?: string;
}): Promise<AdminWorkforceAdjustmentResponse> {
  const res = await fetch("/api/admin/workforce/training-completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(getApiErrorMessage(data, "Failed to record training completion"));
  return data;
}

export async function fetchAdminServiceAreas(): Promise<AdminServiceAreasResponse> {
  const res = await fetch("/api/admin/service-areas", { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to load service areas");
  return data;
}

export async function updateAdminTeamCoverage(teamId: string, payload: { rules: Array<{ weekday: number; areaIds: string[] }> }) {
  const res = await fetch(`/api/admin/teams/${teamId}/coverage`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to update coverage rules");
  return data;
}

// ─── Slots ────────────────────────────────────────────────────────────────────

export type AdminSlotsResponse = {
  date: string;
  team: { id: string; name: string } | null;
  summary: {
    totalSlots: number;
    freeCount: number;
    heldCount: number;
    bookedCount: number;
    blockedCount: number;
  };
  slots: Array<{
    id: string;
    teamId: string;
    teamName: string;
    startTime: string;
    endTime: string;
    state: "free" | "held" | "booked" | "blocked";
    holdExpiresAt: string | null;
    blockedReason: string | null;
    bookingId: string | null;
    bookingStatus: string | null;
    customerMasked: string | null;
  }>;
};

export async function fetchAdminSlots(params: {
  date: string;
  teamId?: string;
  includeBlocked?: boolean;
}): Promise<AdminSlotsResponse> {
  const qs = new URLSearchParams();
  qs.set("date", params.date);
  if (params.teamId) qs.set("teamId", params.teamId);
  if (params.includeBlocked) qs.set("showBlocked", "true");
  const res = await fetch(`/api/admin/slots?${qs.toString()}`, { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error("Failed to load slots");
  return data;
}

export async function blockAdminSlot(slotId: string, payload: { reason: string; blockedByAdminUser?: string | null }) {
  const res = await fetch(`/api/admin/slots/${slotId}/block`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to block slot");
  return data;
}

export async function unblockAdminSlot(slotId: string) {
  const res = await fetch(`/api/admin/slots/${slotId}/unblock`, { method: "POST" });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to unblock slot");
  return data;
}

export async function releaseAdminSlotHold(slotId: string) {
  const res = await fetch(`/api/admin/slots/${slotId}/release-hold`, { method: "POST" });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to release hold");
  return data;
}

export async function releaseAdminSlotHoldsBulk(slotIds: string[]) {
  const res = await fetch("/api/admin/slots/bulk/release-hold", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slotIds }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Failed to release selected holds");
  return data as { success: true; releasedCount: number; skippedCount: number };
}

export async function blockAdminSlotRange(payload: {
  date: string;
  teamId: string;
  startTime: string;
  endTime: string;
  reason: string;
  adminUser?: string | null;
}) {
  const res = await fetch("/api/admin/slots/bulk/block-range", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Failed to block slot range");
  return data as { success: true; blockedCount: number; skippedBookedCount: number; skippedBlockedCount: number };
}

export async function testAdminTeamTelegram(teamId: string, payload?: { message?: string | null }) {
  const res = await fetch(`/api/admin/teams/${teamId}/test-telegram`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload ?? {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to send test Telegram message");
  return data;
}

// ─── Dispatch alerts ──────────────────────────────────────────────────────────

export async function sendSameDayDispatchAlert(payload: {
  bookingId: string;
  teamId?: string;
  alertType: string;
}) {
  const res = await fetch("/api/admin/dispatch/alerts/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to send alert");
  return data;
}

export async function sendBulkDispatchAlerts(payload: {
  bookingIds: string[];
  alertType: string;
}) {
  const res = await fetch("/api/admin/dispatch/alerts/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Failed to send selected alerts");
  return data as {
    success: boolean;
    totalCount: number;
    successCount: number;
    failureCount: number;
    results: Array<{
      bookingId: string;
      success: boolean;
      teamId: string | null;
      teamName: string | null;
      telegramMessageId: string | null;
      error: string | null;
    }>;
  };
}
