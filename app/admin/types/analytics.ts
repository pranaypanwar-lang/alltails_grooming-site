export type AnalyticsResponse = {
  latestReport: {
    id: string;
    type: string;
    periodStart: string;
    periodEnd: string;
    markdown: string;
    generatedAt: string;
  } | null;

  acquisition: {
    newCustomersThisWeek: number;
    newCustomersLastWeek: number;
    bookingsThisWeek: number;
    bookingsLastWeek: number;
    bookingsToday: number;
    sourceBreakdown: { source: string; count: number }[];
  };

  conversionFunnel: {
    slotsHeld: number;
    ordersCreated: number;
    paymentCaptured: number;
    bookingsConfirmed: number;
  };

  revenue: {
    gmvThisWeek: number;
    gmvLastWeek: number;
    gmvThisMonth: number;
    avgBookingValue: number;
    paidCount: number;
    codCount: number;
    cashCount: number;
    couponUsageRate: number;
    avgDiscount: number;
  };

  retention: {
    repeatBookingRate: number;
    atRiskCount: number;
    rebookedWithin35Days: number;
    totalCompletedLast35Days: number;
  };

  operations: {
    dispatchIssueRate: number;
    sopCompletionRate: number;
    avgTimeConfirmedToAssigned: number | null;
  };

  command: {
    healthScore: number;
    priorityCount: number;
    headline: string;
    actionQueue: AnalyticsAction[];
  };

  marketing: {
    attributionCoverage: number;
    googleAttributedBookings: number;
    metaAttributedBookings: number;
    directOrUnknownBookings: number;
    topSources: AnalyticsBreakdownRow[];
    topCampaigns: AnalyticsBreakdownRow[];
    dataQualityNotes: string[];
    platformRoi: PlatformRoiSummary;
  };

  cityPerformance: AnalyticsPerformanceRow[];
  servicePerformance: AnalyticsPerformanceRow[];

  paymentRecovery: {
    failedOrExpiredCount: number;
    failedOrExpiredValue: number;
    retryableCount: number;
    paidAfterFailureCount: number;
    dropOffRate: number;
  };

  operationsDeepDive: {
    bookingsMissingAddress: number;
    unassignedUpcoming: number;
    issueBookings: number;
    topIssueCities: AnalyticsBreakdownRow[];
  };
};

export type AnalyticsAction = {
  id: string;
  priority: "high" | "medium" | "low";
  area: "marketing" | "conversion" | "retention" | "operations" | "finance";
  title: string;
  finding: string;
  recommendedAction: string;
  impact: string;
  confidence: "high" | "medium" | "low";
  href: string;
};

export type AnalyticsBreakdownRow = {
  label: string;
  count: number;
  revenue: number;
  conversionRate?: number;
};

export type AnalyticsPerformanceRow = {
  label: string;
  bookings: number;
  paidBookings: number;
  confirmedBookings: number;
  revenue: number;
  avgOrderValue: number;
  conversionRate: number;
  issueRate: number;
};

export type PlatformConnectionStatus = {
  connected: boolean;
  status: "connected" | "not_configured" | "error";
  message: string;
};

export type PlatformCampaignRow = {
  platform: "Meta" | "Google";
  campaignId: string;
  campaignName: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  platformRevenue: number;
  internalRevenue: number;
  cpc: number;
  cpm: number;
  ctr: number;
  roas: number;
  matchQuality: "strong" | "partial" | "weak" | "unknown";
};

export type PlatformRoiSummary = {
  periodLabel: string;
  meta: PlatformConnectionStatus;
  google: PlatformConnectionStatus;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  platformRevenue: number;
  internalAttributedRevenue: number;
  cpc: number;
  cpm: number;
  ctr: number;
  roas: number;
  campaigns: PlatformCampaignRow[];
};
