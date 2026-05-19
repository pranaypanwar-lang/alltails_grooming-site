export type DashboardSignal = {
  id: string;
  tone: "danger" | "warning" | "default";
  title: string;
  description: string;
  href: string;
};

export type DashboardResponse = {
  pulse: {
    confirmed: number;
    enRoute: number;
    started: number;
    completed: number;
    issues: number;
    pendingPayment: number;
  };
  signals: DashboardSignal[];
  cashPosition: {
    id: string;
    name: string;
    team: string;
    cashHeld: number;
    lastDepositAt: string | null;
    daysSinceLastDeposit: number | null;
  }[];
  todayTimeline: { hour: number; count: number }[];
};
