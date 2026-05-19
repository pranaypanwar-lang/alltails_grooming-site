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
};
