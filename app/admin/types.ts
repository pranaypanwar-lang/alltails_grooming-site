export type AdminBookingStatus =
  | "pending_payment"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "payment_expired";

export type AdminPaymentStatus =
  | "unpaid"
  | "paid"
  | "pending_cash_collection"
  | "covered_by_loyalty"
  | "expired";

export type AdminLoyaltyState =
  | "reward_applied"
  | "reward_restored"
  | "counted"
  | "not_counted"
  | "unlock_ready";

export type AdminBookingActionId =
  | "view_details"
  | "assign_team"
  | "reassign_team"
  | "assign_groomer"
  | "reassign_groomer"
  | "reschedule"
  | "cancel"
  | "mark_completed"
  | "mark_en_route"
  | "mark_started"
  | "mark_issue"
  | "retry_payment_support"
  | "send_payment_link"
  | "edit_metadata"
  | "send_customer_message"
  | "relay_call"
  | "send_same_day_alert";

export type AdminDispatchActionId =
  | "assign_team"
  | "reassign_team"
  | "assign_groomer"
  | "reassign_groomer"
  | "reschedule"
  | "cancel"
  | "mark_en_route"
  | "mark_started"
  | "mark_completed"
  | "relay_call"
  | "open_details"
  | "send_same_day_alert";

export type AdminDispatchState =
  | "unassigned"
  | "assigned"
  | "en_route"
  | "started"
  | "completed"
  | "issue";

export type AdminAddressStatus = "missing" | "partial" | "complete";

export type AdminBookingTeam = { id: string; name: string };
export type AdminBookingService = { id: string; name: string };
export type AdminGroomerMember = {
  id: string;
  name: string;
  role: string;
  currentRank: string;
  currentXp: number;
  currentLevel?: number;
  rewardPoints?: number;
};

export type AdminBookingCustomer = {
  id: string;
  name: string;
  phoneMasked: string;
  phoneFull?: string;
};

export type AdminBookingWindow = {
  bookingWindowId: string | null;
  startTime: string;
  endTime: string;
  displayLabel: string;
  slotIds: string[];
};

export type AdminBookingDetailWindow = {
  bookingWindowId: string | null;
  startTime: string;
  endTime: string;
  displayLabel: string;
  team: AdminBookingTeam | null;
  slots: Array<{
    bookingSlotId: string;
    slotId: string;
    startTime: string;
    endTime: string;
    bookingSlotStatus: "hold" | "confirmed" | "released";
    slotState: {
      isBooked: boolean;
      isHeld: boolean;
      isBlocked: boolean;
      holdExpiresAt: string | null;
    };
  }>;
};

export type AdminBookingFinancials = {
  originalAmount: number;
  finalAmount: number;
  discountAmount: number;
  couponCode: string | null;
  currency: "INR";
};

export type AdminBookingAddressInfo = {
  status: AdminAddressStatus;
  statusLabel: string;
  addressReceived: boolean;
  locationReceived: boolean;
  serviceAddress: string | null;
  serviceLandmark: string | null;
  servicePincode: string | null;
  serviceLocationUrl: string | null;
  addressUpdatedAt: string | null;
};

export type AdminBookingLoyaltySummary = {
  eligible: boolean;
  rewardApplied: boolean;
  rewardRestored: boolean;
  counted: boolean;
  completedCountBefore: number | null;
  completedCountAfter: number | null;
  rewardLabel: string | null;
};

export type AdminBookingLoyaltyDetail = {
  eligible: boolean;
  rewardApplied: boolean;
  rewardRestored: boolean;
  rewardLabel: string | null;
  completedCountBefore: number | null;
  completedCountAfter: number | null;
  countedAt: string | null;
};

export type AdminBookingUrgency = {
  sameDay: boolean;
  paymentExpiringSoon: boolean;
  needsAssignment: boolean;
};

export type AdminBookingPetDetail = {
  bookingPetId: string;
  petId: string;
  sourcePetId: string | null;
  isSavedProfile: boolean;
  name: string | null;
  breed: string;
  groomingNotes: string | null;
  stylingNotes: string | null;
  stylingReferenceUrls: string[];
  concernPhotoUrls: string[];
};

export type AdminBookingPaymentAudit = {
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  paymentPendingReason: string | null;
  paymentGatewayError: string | null;
  paymentExpiresAt: string | null;
  paymentFailedAt: string | null;
  paymentExpiredAt: string | null;
};

export type AdminBookingRefundSummary = {
  refundMode: "manual_refund" | "razorpay_refund" | "waived";
  refundLabel: string;
  reason: string;
  refundNotes: string | null;
  cancelledAt: string;
  originalAmount: number | null;
  finalAmount: number | null;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
};

export type AdminBookingPaymentCollection = {
  collectionMode: "cash" | "online" | "waived";
  collectedAmount: number;
  expectedAmount: number;
  mismatchFlag: boolean;
  serviceAmountUpdated: boolean;
  serviceAmountDirection: "upsell" | "downgrade" | null;
  notes: string | null;
  recordedAt: string;
  recordedBy: string | null;
};

export type AdminBookingTimelineItem = {
  type: string;
  label: string;
  at: string | null;
  actor?: string | null;
};

export type AdminBookingDispatchAlert = {
  id: string;
  alertType: string;
  team: AdminBookingTeam;
  sentAt: string;
  success: boolean;
  error: string | null;
  telegramMessageId: string | null;
};

export type AdminBookingCustomerMessage = {
  id: string;
  channel: string;
  messageType: string;
  language: string;
  status: string;
  recipient: string;
  content: string;
  actionUrl: string | null;
  error: string | null;
  preparedAt: string;
  sentAt: string | null;
};

export type AdminBookingSopProof = {
  id: string;
  stepKey: string;
  proofType: string;
  publicUrl: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

export type AdminBookingSopStep = {
  id: string;
  key: string;
  label: string;
  proofType: "manual" | "image" | "video" | "mixed";
  requiredForCompletion: boolean;
  status: "pending" | "completed";
  notes: string | null;
  completedAt: string | null;
  completedBy: string | null;
  proofs: AdminBookingSopProof[];
};

export type AdminBookingQaReview = {
  status: AdminQaStatus;
  label: string;
  notes: string | null;
  reviewedAt: string;
  reviewedBy: string | null;
  completedWithoutProof: boolean;
  completedBooking: boolean;
};

export type AdminBookingListItem = {
  id: string;
  status: AdminBookingStatus;
  statusLabel: string;
  paymentStatus: AdminPaymentStatus;
  paymentStatusLabel: string;
  paymentMethod: "pay_now" | "pay_after_service" | null;
  paymentMethodLabel: string | null;
  selectedDate: string | null;
  createdAt: string;
  city: string | null;
  service: AdminBookingService;
  customer: AdminBookingCustomer;
  team: AdminBookingTeam | null;
  groomerMember: AdminGroomerMember | null;
  bookingWindow: AdminBookingWindow | null;
  pets: { count: number; names: string[]; breeds: string[] };
  financials: AdminBookingFinancials;
  loyalty: AdminBookingLoyaltySummary;
  urgency: AdminBookingUrgency;
  availableActions: AdminBookingActionId[];
};

export type AdminBookingsSummary = {
  pendingPaymentCount: number;
  confirmedCount: number;
  completedCount: number;
  cancelledCount: number;
  paymentExpiredCount: number;
  unassignedCount: number;
  sameDayCount: number;
};

export type AdminBookingsResponse = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  summary: AdminBookingsSummary;
  bookings: AdminBookingListItem[];
};

export type AdminBookingDetail = {
  id: string;
  status: AdminBookingStatus;
  statusLabel: string;
  statusCategory: "upcoming" | "past";
  supportingText: string;
  paymentStatus: AdminPaymentStatus;
  paymentStatusLabel: string;
  paymentMethod: "pay_now" | "pay_after_service" | null;
  paymentMethodLabel: string | null;
  createdAt: string;
  selectedDate: string | null;
  bookingSource: string;
  customer: { id: string; name: string; phoneMasked: string; phoneFull?: string; city: string | null };
  addressInfo: AdminBookingAddressInfo;
  service: AdminBookingService;
  groomerMember: AdminGroomerMember | null;
  financials: AdminBookingFinancials;
  bookingWindow: AdminBookingDetailWindow | null;
  pets: AdminBookingPetDetail[];
  paymentAudit: AdminBookingPaymentAudit;
  paymentCollection: AdminBookingPaymentCollection | null;
  refundSummary: AdminBookingRefundSummary | null;
  loyalty: AdminBookingLoyaltyDetail;
  adminNote?: string | null;
  dispatchState?: AdminDispatchState;
  dispatchAlerts: AdminBookingDispatchAlert[];
  customerMessages: AdminBookingCustomerMessage[];
  sopSteps: AdminBookingSopStep[];
  qaReview: AdminBookingQaReview | null;
  timeline: AdminBookingTimelineItem[];
  availableActions: AdminBookingActionId[];
};

export type AdminBookingDetailResponse = { booking: AdminBookingDetail };

export type AdminBookingSopUpdateResponse = {
  success: true;
  bookingId: string;
  stepKey: string;
  status: "pending" | "completed";
};

export type AdminBookingSopProofUploadResponse = {
  success: true;
  bookingId: string;
  stepKey: string;
  proof: AdminBookingSopProof;
};

export type AdminBookingPaymentCollectionResponse = {
  success: true;
  bookingId: string;
  paymentCollection: AdminBookingPaymentCollection;
  finalAmount: number;
};

export type AdminBookingCreateMetaResponse = {
  services: Array<{ id: string; name: string; price: number }>;
  serviceAreas: Array<{ id: string; name: string; slug: string; isActive: boolean }>;
};

export type AdminSavedPet = {
  petId: string;
  name: string | null;
  breed: string;
  imageUrl: string | null;
  species: "dog" | "cat" | "unknown";
  lastBookedAt: string | null;
  defaultGroomingNotes: string | null;
  defaultStylingNotes: string | null;
};

export type AdminSavedPetsResponse = {
  found: boolean;
  pets: AdminSavedPet[];
};

export type AdminManualBookingSource =
  | "call"
  | "instagram_dm"
  | "whatsapp"
  | "manual_internal";

export type AdminManualBookingPayload = {
  name: string;
  phone: string;
  city: string;
  serviceName: string;
  selectedDate: string;
  bookingWindowId: string;
  slotIds: string[];
  customStartTime?: string;
  customEndTime?: string;
  customAmount?: number;
  serviceAddress?: string;
  serviceLandmark?: string;
  servicePincode?: string;
  serviceLocationUrl?: string;
  pets: Array<{
    sourcePetId?: string;
    isSavedProfile?: boolean;
    name?: string;
    breed: string;
    stylingNotes?: string;
    groomingNotes?: string;
    stylingAssets?: Array<{
      storageKey: string;
      publicUrl: string;
      originalName: string;
    }>;
    concernAssets?: Array<{
      storageKey: string;
      publicUrl: string;
      originalName: string;
    }>;
  }>;
  paymentMethod: "pay_now" | "pay_after_service";
  couponCode?: string;
  source: AdminManualBookingSource;
  adminNote?: string;
};

export type AdminManualBookingResponse = {
  success: true;
  bookingId: string;
  accessToken: string | null;
  selectedDate: string;
  bookingWindowId: string;
  bookingWindowLabel: string;
  paymentMethod: "pay_now" | "pay_after_service";
  paymentStatus: string;
  status: string;
  originalAmount: number;
  finalAmount: number;
  couponCode: string | null;
  paymentOrder: { orderId: string; amount: number; currency: string } | null;
  paymentExpiresAt: string | null;
};

export type AdminBookingsQuery = {
  page?: number;
  pageSize?: number;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  city?: string;
  teamId?: string;
  bookingStatus?: AdminBookingStatus | "";
  paymentStatus?: AdminPaymentStatus | "";
  loyaltyState?: AdminLoyaltyState | "";
  serviceName?: string;
  sameDayOnly?: boolean;
  needsAssignment?: boolean;
  paymentExpiringSoon?: boolean;
  tomorrowOnly?: boolean;
  search?: string;
  sortBy?: "selectedDate" | "createdAt" | "startTime" | "city" | "status";
  sortOrder?: "asc" | "desc";
};

export type AdminDispatchCard = {
  bookingId: string;
  status: AdminBookingStatus;
  paymentStatus: AdminPaymentStatus;
  customer: { name: string; phoneMasked: string };
  city: string | null;
  serviceName: string;
  groomerMember: Pick<AdminGroomerMember, "id" | "name" | "role" | "currentRank"> | null;
  pets: { count: number; summary: string };
  bookingWindow: { startTime: string; endTime: string; displayLabel: string } | null;
  loyalty: { rewardApplied: boolean; rewardLabel: string | null };
  addressInfo: Pick<AdminBookingAddressInfo, "status" | "statusLabel" | "addressReceived" | "locationReceived">;
  urgency: {
    sameDay: boolean;
    lateFill: boolean;
    paymentExpiringSoon: boolean;
    issueFlag: boolean;
    addressPending: boolean;
    delayRisk: boolean;
  };
  dispatchState: AdminDispatchState;
  availableActions: AdminDispatchActionId[];
};

export type AdminDispatchGroup = {
  team: AdminBookingTeam;
  capacity: { totalWindows: number | null; assignedJobs: number; freeWindows: number | null; overload: boolean };
  bookings: AdminDispatchCard[];
};

export type AdminDispatchSummary = {
  totalBookings: number;
  unassignedCount: number;
  assignedCount: number;
  completedCount: number;
  issueCount: number;
  pendingPaymentCount: number;
  sameDayLateFillCount: number;
  addressPendingCount: number;
  delayRiskCount: number;
};

export type AdminDispatchResponse = {
  date: string;
  city: string | null;
  summary: AdminDispatchSummary;
  groups: AdminDispatchGroup[];
  unassigned: AdminDispatchCard[];
};

export type AdminQaStatus = "not_started" | "in_progress" | "complete" | "issue";

export type AdminQaRow = {
  bookingId: string;
  createdAt: string;
  selectedDate: string | null;
  windowLabel: string | null;
  customer: {
    name: string;
    phoneMasked: string;
  };
  city: string | null;
  serviceName: string;
  team: AdminBookingTeam | null;
  bookingStatus: AdminBookingStatus;
  bookingStatusLabel: string;
  dispatchState: AdminDispatchState;
  qaStatus: AdminQaStatus;
  qaStatusLabel: string;
  qaReviewStatusLabel: string | null;
  qaCompletedWithoutProof: boolean;
  requiredCompletedCount: number;
  requiredTotalCount: number;
  requiredProofCompletedCount: number;
  requiredProofTotalCount: number;
  totalCompletedCount: number;
  totalStepCount: number;
  missingStepLabels: string[];
  missingProofLabels: string[];
  totalProofCount: number;
  recentProofs: Array<{
    id: string;
    stepKey: string;
    publicUrl: string;
    mimeType: string;
  }>;
  paymentMismatchFlag: boolean;
  paymentMethodLabel: string | null;
};

export type AdminQaSummary = {
  totalBookings: number;
  completeCount: number;
  inProgressCount: number;
  notStartedCount: number;
  issueCount: number;
  mismatchCount: number;
};

export type AdminQaFilters = {
  search: string;
  teamId: string;
  date: string;
  qaStatus: AdminQaStatus | "";
  mismatchOnly: boolean;
};

export type AdminQaResponse = {
  summary: AdminQaSummary;
  bookings: AdminQaRow[];
};

export type AdminBookingQaReviewResponse = {
  success: true;
  bookingId: string;
  qaStatus: Exclude<AdminQaStatus, "not_started">;
  notes: string | null;
  completion: (AdminCompleteBookingResponse & { rewardSuppressedReason?: string | null }) | null;
};

export type AdminDigestHistoryEntry = {
  digestDate: string;
  sentAt: string;
  team: AdminBookingTeam;
  bookingCount: number;
  success: boolean;
  error: string | null;
  telegramMessageId: string | null;
};

export type AdminDigestHistoryResponse = {
  entries: AdminDigestHistoryEntry[];
};

export type AdminDispatchAlertHistoryEntry = {
  id: string;
  sentAt: string;
  alertType: string;
  success: boolean;
  error: string | null;
  telegramMessageId: string | null;
  team: AdminBookingTeam;
  booking: {
    id: string;
    selectedDate: string | null;
    customerName: string;
    serviceName: string;
  };
};

export type AdminDispatchAlertHistoryResponse = {
  entries: AdminDispatchAlertHistoryEntry[];
};

export type AdminCustomerMessageRow = {
  id: string;
  bookingId: string;
  selectedDate: string | null;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  city: string | null;
  messageType: string;
  channel: string;
  language: string;
  status: string;
  recipient: string;
  content: string;
  actionUrl: string | null;
  error: string | null;
  providerRef: string | null;
  preparedAt: string;
  sentAt: string | null;
};

export type AdminCustomerMessagesSummary = {
  totalMessages: number;
  bookingConfirmationCount: number;
  reminderCount: number;
  careGuideCount: number;
  reviewRequestCount: number;
  rebookingReminderCount: number;
  careTipCount: number;
  customOfferCount: number;
  queuedCount: number;
  sentCount: number;
  failedCount: number;
};

export type AdminCustomerMessagesFilters = {
  search: string;
  messageType: string;
  status: string;
  date: string;
};

export type AdminCustomerMessagesResponse = {
  summary: AdminCustomerMessagesSummary;
  messages: AdminCustomerMessageRow[];
};

export type AdminCustomerMessageStatusResponse = {
  success: true;
  message: AdminCustomerMessageRow;
};

export type AdminCustomerMessageQueueProcessResponse = {
  success?: true;
  diagnostics: {
    provider: string;
    configured: boolean;
    hasWebhookVerifyToken: boolean;
  };
  provider: string;
  configured: boolean;
  processedCount: number;
  acceptedCount: number;
  failedCount: number;
  results: Array<{
    messageId: string;
    bookingId: string;
    sentToProvider: boolean;
    providerRef: string | null;
    error: string | null;
  }>;
};

export type AdminCampaignPrepareResponse = {
  success: true;
  audienceCount: number;
  preparedCount: number;
  results: Array<{ bookingId: string; created: boolean }>;
};

export type AdminSupportCase = {
  id: string;
  bookingId: string | null;
  category: string;
  status: string;
  priority: string;
  source: string;
  summary: string;
  details: string | null;
  resolution: string | null;
  customerName: string | null;
  customerPhone: string | null;
  city: string | null;
  openedBy: string | null;
  resolvedBy: string | null;
  openedAt: string;
  resolvedAt: string | null;
  booking: {
    id: string;
    selectedDate: string | null;
    serviceName: string;
    customerName: string;
  } | null;
};

export type AdminSupportSummary = {
  totalCases: number;
  openCount: number;
  inProgressCount: number;
  resolvedCount: number;
  urgentCount: number;
  failedPaymentSignals: number;
  missingAddressSignals: number;
  groomerDelaySignals: number;
};

export type AdminSupportFilters = {
  search: string;
  category: string;
  status: string;
  priority: string;
  date: string;
};

export type AdminSupportResponse = {
  summary: AdminSupportSummary;
  cases: AdminSupportCase[];
};

export type AdminSupportCaseResponse = {
  success: true;
  case: AdminSupportCase;
};

export type AdminSupportSignalScanResponse = {
  success: true;
  scanned: {
    failedPayment: number;
    missingAddress: number;
    groomerDelay: number;
  };
  createdCount: number;
  skippedCount: number;
  results: Array<{
    bookingId: string;
    category: "failed_payment" | "missing_address" | "groomer_delay";
    created: boolean;
  }>;
};

export type AdminCompleteBookingResponse = {
  success: true;
  bookingId: string;
  status: "completed";
  loyalty: { counted: boolean; completedCountBefore: number | null; completedCountAfter: number | null; freeUnlockedAfter: boolean };
  rewardsDelta?: Array<{
    eventType: string;
    summary: string;
    xpAwarded: number;
    rewardPointsAwarded: number;
    trustDelta: number;
    performanceDelta: number;
  }>;
  rewardSummary?: {
    teamMember: {
      id: string;
      name: string;
      role?: string;
      currentXp: number;
      currentRank: string;
      currentLevel?: number;
      rewardPoints?: number;
      trustScore?: number;
      performanceScore?: number;
      salaryHikeStage?: number;
      completedCount: number;
      onTimeCount: number;
      reviewCount: number;
    };
    gamification?: {
      level: number;
      rank: string;
      baseRank: string;
      rankPerk: string;
      rewardPoints: number;
      trustScore: number;
      performanceScore: number;
      salaryHikeStage: number;
      salaryHikeLabel: string;
      nextRank: { label: string; xpRequired: number; xpRemaining: number } | null;
      nextSalaryHike: { label: string; xpRequired: number; xpRemaining: number } | null;
      progress: {
        currentXp: number;
        currentLevelXpFloor: number;
        nextLevelXpTarget: number;
        nextLevelXpRemaining: number;
        rankProgressPercent: number;
      };
      streaks: {
        punctuality: number;
        reviews: number;
        noLeaveDays: number;
      };
      scoreBreakdown: {
        completion: number;
        punctuality: number;
        reviews: number;
        growth: number;
      };
      badges: string[];
    };
    totalXpAwarded: number;
    totalRewardPointsAwarded?: number;
    rewards: Array<{
      eventType: string;
      summary: string;
      xpAwarded: number;
      rewardPointsAwarded: number;
      trustDelta: number;
      performanceDelta: number;
    }>;
    reviewMilestone?: unknown;
  } | null;
};

export type AdminCancelBookingResponse = {
  success: true;
  bookingId: string;
  status: "cancelled";
  loyaltyRewardRestored: boolean;
};

export type AdminAssignTeamResponse = {
  success: true;
  bookingId: string;
  team: AdminBookingTeam | null;
  dispatchState: string;
};

export type AdminAssignGroomerResponse = {
  success: true;
  bookingId: string;
  groomerMember: AdminGroomerMember | null;
  dispatchState: string;
};

export type AdminWorkforceMemberRow = {
  id: string;
  name: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  team: AdminBookingTeam;
  currentXp: number;
  lifetimeXp: number;
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
  salaryAdvanceEligibility: {
    eligible: boolean;
    tenureMonths: number;
    minimumTenureMonths: number;
    nextEligibleAt: string | null;
  };
  upcomingBookingsCount: number;
  recentRewardEvents: Array<{
    id: string;
    eventType: string;
    summary: string;
    xpAwarded: number;
    rewardPointsAwarded: number;
    createdAt: string;
  }>;
  gamification: {
    level: number;
    rank: string;
    baseRank: string;
    rankPerk: string;
    rewardPoints: number;
    trustScore: number;
    performanceScore: number;
    salaryHikeStage: number;
    salaryHikeLabel: string;
    nextRank: { label: string; xpRequired: number; xpRemaining: number } | null;
    nextSalaryHike: { label: string; xpRequired: number; xpRemaining: number } | null;
    progress: {
      currentXp: number;
      currentLevelXpFloor: number;
      nextLevelXpTarget: number;
      nextLevelXpRemaining: number;
      rankProgressPercent: number;
    };
    streaks: {
      punctuality: number;
      reviews: number;
      noLeaveDays: number;
    };
    scoreBreakdown: {
      completion: number;
      punctuality: number;
      reviews: number;
      growth: number;
    };
    badges: string[];
  };
};

export type AdminWorkforceSummary = {
  totalMembers: number;
  activeMembers: number;
  salaryHikeReadyCount: number;
  avgPerformanceScore: number;
  avgTrustScore: number;
  totalRewardPoints: number;
};

export type AdminWorkforceResponse = {
  summary: AdminWorkforceSummary;
  leaderboard: AdminWorkforceMemberRow[];
  leaveRequests: AdminWorkforceLeaveRequest[];
  salaryAdvanceRequests: AdminWorkforceSalaryAdvanceRequest[];
  referrals: AdminWorkforceReferralRecord[];
  trainingModules: AdminTrainingModuleRow[];
};

export type AdminWorkforceLeaveRequest = {
  id: string;
  leaveType: string;
  status: string;
  emergencyFlag: boolean;
  startDate: string;
  endDate: string;
  reason: string;
  reviewNote: string | null;
  requestedAt: string;
  reviewedAt: string | null;
  teamMember: {
    id: string;
    name: string;
    role: string;
    team: AdminBookingTeam;
  };
};

export type AdminWorkforceSalaryAdvanceRequest = {
  id: string;
  status: string;
  amount: number;
  reason: string;
  eligibilitySnapshot: boolean;
  tenureMonthsSnapshot: number;
  trustScoreSnapshot: number;
  performanceSnapshot: number;
  nextEligibleAt: string | null;
  reviewNote: string | null;
  requestedAt: string;
  reviewedAt: string | null;
  teamMember: {
    id: string;
    name: string;
    role: string;
    team: AdminBookingTeam;
  };
};

export type AdminWorkforceReferralRecord = {
  id: string;
  candidateName: string;
  candidatePhone: string | null;
  role: string;
  status: string;
  notes: string | null;
  joinedAt: string | null;
  probationPassedAt: string | null;
  rewardIssuedAt: string | null;
  createdAt: string;
  referrerMember: {
    id: string;
    name: string;
    role: string;
    team: AdminBookingTeam;
  };
};

export type AdminTrainingModuleRow = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  xpReward: number;
  rewardPointsReward: number;
  isActive: boolean;
  completionCount: number;
  recentCompletions: Array<{
    id: string;
    status: string;
    score: number | null;
    notes: string | null;
    completedAt: string;
    teamMember: {
      id: string;
      name: string;
      team: AdminBookingTeam;
    };
  }>;
};

export type AdminWorkforceAdjustmentResponse = {
  success: true;
  rewardSummary: AdminCompleteBookingResponse["rewardSummary"];
  rewardsDelta: NonNullable<AdminCompleteBookingResponse["rewardsDelta"]>;
};

export type AdminWorkforceMutationResponse = {
  success: true;
};

export type AdminRescheduleBookingResponse = {
  success: true;
  bookingId: string;
  bookingWindow: {
    startTime: string;
    endTime: string;
    team: AdminBookingTeam;
  };
};

export type AdminRetryPaymentSupportResponse = {
  success: true;
  bookingId: string;
  orderId: string;
  amount: number;
  currency: string;
  paymentLinkUrl?: string;
};

export type AdminDispatchStateResponse = {
  success: true;
  bookingId: string;
  dispatchState: AdminDispatchState;
};

export type AdminBookingMetadataResponse = {
  success: true;
  bookingId: string;
  bookingSource: string;
  adminNote: string | null;
  addressInfo: AdminBookingAddressInfo;
};

export type AdminPaymentLinkResponse = {
  success: true;
  bookingId: string;
  paymentLinkUrl: string;
  accessToken: string;
  expiresAt: string | null;
};

export type AdminRelayCallResponse = {
  success: true;
  session: {
    id: string;
    bookingId: string;
    teamId: string;
    outcome: string | null;
  };
};

export type AdminCustomerMessageResponse = {
  success: true;
  bookingId: string;
  message: AdminBookingCustomerMessage;
};

export type AdminBookingsFilters = {
  tab: "all" | "today" | "tomorrow" | "pending_payment" | "confirmed" | "completed" | "cancelled" | "payment_expired";
  date: string;
  dateFrom: string;
  dateTo: string;
  city: string;
  teamId: string;
  bookingStatus: AdminBookingStatus | "";
  paymentStatus: AdminPaymentStatus | "";
  loyaltyState: AdminLoyaltyState | "";
  serviceName: string;
  sameDayOnly: boolean;
  needsAssignment: boolean;
  paymentExpiringSoon: boolean;
  tomorrowOnly: boolean;
  search: string;
  sortBy: "selectedDate" | "createdAt" | "startTime" | "city" | "status";
  sortOrder: "asc" | "desc";
};

export type AdminDispatchFilters = {
  viewMode: "today" | "tomorrow" | "custom_date";
  date: string;
  city: string;
  includeCompleted: boolean;
  addressPendingOnly: boolean;
};
