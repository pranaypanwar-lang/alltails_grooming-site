import type {
  CampaignVerdict,
  PlatformCampaignRow,
  PlatformConnectionStatus,
  PlatformRoiSummary,
} from "../../app/admin/types/analytics";

type InternalCampaignRevenue = Map<string, number>;

type MetaInsightRow = {
  campaign_id?: string;
  campaign_name?: string;
  impressions?: string;
  clicks?: string;
  inline_link_clicks?: string;
  spend?: string;
  cpc?: string;
  cpm?: string;
  ctr?: string;
  actions?: Array<{ action_type?: string; value?: string }>;
  action_values?: Array<{ action_type?: string; value?: string }>;
};

type GoogleAdsStreamChunk = {
  results?: Array<{
    campaign?: { id?: string; name?: string };
    metrics?: {
      impressions?: string;
      clicks?: string;
      costMicros?: string;
      conversions?: number;
      conversionsValue?: number;
    };
  }>;
};

const PERIOD_LABEL = "Trailing 30 days";

function getCampaignVerdict(row: {
  spend: number;
  cpc: number;
  ctr: number;
  roas: number;
  conversions: number;
}): { verdict: CampaignVerdict; recommendation: string } {
  if (row.spend === 0) {
    return {
      verdict: "monitor",
      recommendation: "No spend recorded — campaign may be paused or not yet started.",
    };
  }

  // Scale: ROAS is strong and conversions are happening
  if (row.roas >= 2 && row.conversions >= 1) {
    const rec =
      row.spend < 5000
        ? `ROAS ${row.roas.toFixed(1)}x on modest budget — increase daily spend to capture more demand while it's working.`
        : `ROAS ${row.roas.toFixed(1)}x with healthy volume — test audience expansion or lookalikes to scale further.`;
    return { verdict: "scale", recommendation: rec };
  }

  // Pause: spending significant money with very poor returns
  if (
    (row.spend > 2000 && row.roas < 0.8) ||
    (row.spend > 5000 && row.conversions === 0)
  ) {
    const parts: string[] = [];
    if (row.roas > 0 && row.roas < 0.8) parts.push(`ROAS is only ${row.roas.toFixed(1)}x`);
    if (row.conversions === 0) parts.push("zero conversions tracked");
    if (row.cpc > 40) parts.push(`CPC ₹${Math.round(row.cpc)} is high for this market`);
    return {
      verdict: "pause",
      recommendation: `Pause and audit — ${parts.join(", ")}. Review creative, audience match, and landing page before resuming spend.`,
    };
  }

  // Optimise: everything else with spend > 0
  const tips: string[] = [];
  if (row.cpc > 40)
    tips.push(`reduce CPC from ₹${Math.round(row.cpc)} by tightening audience or testing new ad copy`);
  if (row.ctr < 0.01)
    tips.push("CTR under 1% — refresh creative or test a stronger headline offer");
  if (row.roas > 0 && row.roas < 1.5)
    tips.push("ROAS under 1.5x — align ad scheduling with peak booking hours (10am–2pm)");
  if (tips.length === 0)
    tips.push("Attribution may be partial — ensure UTM labels in booking links match this campaign name exactly");

  const firstTip = tips[0].charAt(0).toUpperCase() + tips[0].slice(1);
  const rest = tips.slice(1).map((t) => t.charAt(0).toUpperCase() + t.slice(1));
  return {
    verdict: "optimise",
    recommendation: `${firstTip}.${rest.length > 0 ? " Also: " + rest.join(". ") + "." : ""}`,
  };
}

function numberValue(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function rate(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : 0;
}

function blankStatus(status: PlatformConnectionStatus["status"], message: string): PlatformConnectionStatus {
  return { connected: status === "connected", status, message };
}

function emptySummary(meta: PlatformConnectionStatus, google: PlatformConnectionStatus): PlatformRoiSummary {
  return {
    periodLabel: PERIOD_LABEL,
    meta,
    google,
    spend: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    platformRevenue: 0,
    internalAttributedRevenue: 0,
    cpc: 0,
    cpm: 0,
    ctr: 0,
    roas: 0,
    campaigns: [],
  };
}

function getActionValue(actions: MetaInsightRow["actions"], needles: string[]) {
  if (!actions) return 0;
  return actions.reduce((sum, action) => {
    const actionType = action.action_type ?? "";
    return needles.some((needle) => actionType.includes(needle)) ? sum + numberValue(action.value) : sum;
  }, 0);
}

function getInternalRevenue(campaignName: string, internalRevenueByCampaign: InternalCampaignRevenue) {
  const normalized = campaignName.trim().toLowerCase();
  if (!normalized) return 0;
  return internalRevenueByCampaign.get(normalized) ?? 0;
}

function getMatchQuality(row: { spend: number; platformRevenue: number; internalRevenue: number }) {
  if (row.internalRevenue <= 0 && row.platformRevenue <= 0) return "unknown" as const;
  if (row.internalRevenue > 0 && row.platformRevenue > 0) {
    const ratio = row.internalRevenue / row.platformRevenue;
    if (ratio >= 0.7 && ratio <= 1.3) return "strong" as const;
    return "partial" as const;
  }
  if (row.spend > 0 && (row.internalRevenue > 0 || row.platformRevenue > 0)) return "partial" as const;
  return "weak" as const;
}

async function fetchMetaCampaigns(
  internalRevenueByCampaign: InternalCampaignRevenue,
  datePreset = "last_30d"
) {
  const accessToken =
    process.env.META_MARKETING_ACCESS_TOKEN?.trim() ||
    process.env.META_ADS_ACCESS_TOKEN?.trim() ||
    process.env.META_CAPI_ACCESS_TOKEN?.trim();
  const rawAccountId = process.env.META_AD_ACCOUNT_ID?.trim();

  if (!accessToken || !rawAccountId) {
    return {
      status: blankStatus(
        "not_configured",
        "Set META_AD_ACCOUNT_ID and META_MARKETING_ACCESS_TOKEN to pull Meta Ads spend."
      ),
      campaigns: [] as PlatformCampaignRow[],
    };
  }

  const accountId = rawAccountId.startsWith("act_") ? rawAccountId : `act_${rawAccountId}`;
  const version = process.env.META_GRAPH_API_VERSION?.trim() || "v25.0";
  const params = new URLSearchParams({
    access_token: accessToken,
    level: "campaign",
    date_preset: datePreset,
    limit: "100",
    fields: [
      "campaign_id",
      "campaign_name",
      "impressions",
      "clicks",
      "inline_link_clicks",
      "spend",
      "cpc",
      "cpm",
      "ctr",
      "actions",
      "action_values",
    ].join(","),
  });

  try {
    const response = await fetch(`https://graph.facebook.com/${version}/${accountId}/insights?${params.toString()}`, {
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        typeof payload?.error?.message === "string"
          ? payload.error.message
          : `Meta Ads returned HTTP ${response.status}`;
      return { status: blankStatus("error", message), campaigns: [] as PlatformCampaignRow[] };
    }

    const rows = Array.isArray(payload?.data) ? (payload.data as MetaInsightRow[]) : [];
    const campaigns = rows.map((row) => {
      const campaignName = row.campaign_name || "Unnamed Meta campaign";
      const spend = numberValue(row.spend);
      const impressions = numberValue(row.impressions);
      const clicks = numberValue(row.inline_link_clicks) || numberValue(row.clicks);
      const conversions = getActionValue(row.actions, ["purchase", "lead", "complete_registration"]);
      const platformRevenue = getActionValue(row.action_values, ["purchase"]);
      const internalRevenue = getInternalRevenue(campaignName, internalRevenueByCampaign);
      const cpc = numberValue(row.cpc) || rate(spend, clicks);
      const ctr = numberValue(row.ctr) ? numberValue(row.ctr) / 100 : rate(clicks, impressions);
      const roas = rate(platformRevenue || internalRevenue, spend);
      const { verdict, recommendation } = getCampaignVerdict({ spend, cpc, ctr, roas, conversions });
      return {
        platform: "Meta" as const,
        campaignId: row.campaign_id || campaignName,
        campaignName,
        spend,
        impressions,
        clicks,
        conversions,
        platformRevenue,
        internalRevenue,
        cpc,
        cpm: numberValue(row.cpm) || rate(spend * 1000, impressions),
        ctr,
        roas,
        matchQuality: getMatchQuality({ spend, platformRevenue, internalRevenue }),
        verdict,
        recommendation,
      };
    });

    return {
      status: blankStatus("connected", `Meta Ads connected with ${campaigns.length} campaign row(s).`),
      campaigns,
    };
  } catch (error) {
    return {
      status: blankStatus("error", error instanceof Error ? error.message : "Meta Ads request failed"),
      campaigns: [] as PlatformCampaignRow[],
    };
  }
}

async function getGoogleAccessToken() {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN?.trim();
  if (!clientId || !clientSecret || !refreshToken) return null;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload?.access_token !== "string") {
    const message = typeof payload?.error_description === "string" ? payload.error_description : "Google OAuth token refresh failed";
    throw new Error(message);
  }
  return payload.access_token as string;
}

async function fetchGoogleCampaigns(
  internalRevenueByCampaign: InternalCampaignRevenue,
  googleDuring = "LAST_30_DAYS"
) {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim();
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID?.replace(/-/g, "").trim();

  if (!developerToken || !customerId) {
    return {
      status: blankStatus(
        "not_configured",
        "Set GOOGLE_ADS_CUSTOMER_ID, GOOGLE_ADS_DEVELOPER_TOKEN, OAuth client, and refresh token to pull Google Ads spend."
      ),
      campaigns: [] as PlatformCampaignRow[],
    };
  }

  try {
    const accessToken = await getGoogleAccessToken();
    if (!accessToken) {
      return {
        status: blankStatus("not_configured", "Google Ads OAuth credentials are missing."),
        campaigns: [] as PlatformCampaignRow[],
      };
    }

    const version = process.env.GOOGLE_ADS_API_VERSION?.trim() || "v24";
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value
      FROM campaign
      WHERE segments.date DURING ${googleDuring}
        AND campaign.status != 'REMOVED'
      ORDER BY metrics.cost_micros DESC
      LIMIT 100
    `;

    const headers: Record<string, string> = {
      authorization: `Bearer ${accessToken}`,
      "developer-token": developerToken,
      "content-type": "application/json",
    };
    const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.replace(/-/g, "").trim();
    if (loginCustomerId) headers["login-customer-id"] = loginCustomerId;

    const response = await fetch(
      `https://googleads.googleapis.com/${version}/customers/${customerId}/googleAds:searchStream`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ query }),
        cache: "no-store",
      }
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = typeof payload?.error?.message === "string" ? payload.error.message : `Google Ads returned HTTP ${response.status}`;
      return { status: blankStatus("error", message), campaigns: [] as PlatformCampaignRow[] };
    }

    const chunks = Array.isArray(payload) ? (payload as GoogleAdsStreamChunk[]) : [];
    const campaigns = chunks
      .flatMap((chunk) => chunk.results ?? [])
      .map((row) => {
        const campaignName = row.campaign?.name || "Unnamed Google campaign";
        const metrics = row.metrics ?? {};
        const spend = numberValue(metrics.costMicros) / 1_000_000;
        const impressions = numberValue(metrics.impressions);
        const clicks = numberValue(metrics.clicks);
        const conversions = numberValue(metrics.conversions);
        const platformRevenue = numberValue(metrics.conversionsValue);
        const internalRevenue = getInternalRevenue(campaignName, internalRevenueByCampaign);
        const cpc = rate(spend, clicks);
        const ctr = rate(clicks, impressions);
        const roas = rate(platformRevenue || internalRevenue, spend);
        const { verdict, recommendation } = getCampaignVerdict({ spend, cpc, ctr, roas, conversions });
        return {
          platform: "Google" as const,
          campaignId: row.campaign?.id || campaignName,
          campaignName,
          spend,
          impressions,
          clicks,
          conversions,
          platformRevenue,
          internalRevenue,
          cpc,
          cpm: rate(spend * 1000, impressions),
          ctr,
          roas,
          matchQuality: getMatchQuality({ spend, platformRevenue, internalRevenue }),
          verdict,
          recommendation,
        };
      });

    return {
      status: blankStatus("connected", `Google Ads connected with ${campaigns.length} campaign row(s).`),
      campaigns,
    };
  } catch (error) {
    return {
      status: blankStatus("error", error instanceof Error ? error.message : "Google Ads request failed"),
      campaigns: [] as PlatformCampaignRow[],
    };
  }
}

const GOOGLE_DURING: Record<string, string> = {
  today: "TODAY",
  this_week_mon_today: "THIS_WEEK_MON_TODAY",
  this_month: "THIS_MONTH",
  last_30d: "LAST_30_DAYS",
};

export async function getPlatformRoiSummary(
  internalRevenueByCampaign: InternalCampaignRevenue,
  datePreset = "last_30d"
): Promise<PlatformRoiSummary> {
  const googleDuring = GOOGLE_DURING[datePreset] ?? "LAST_30_DAYS";
  const [metaResult, googleResult] = await Promise.all([
    fetchMetaCampaigns(internalRevenueByCampaign, datePreset),
    fetchGoogleCampaigns(internalRevenueByCampaign, googleDuring),
  ]);

  const campaigns = [...metaResult.campaigns, ...googleResult.campaigns]
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 12);

  if (!campaigns.length) return emptySummary(metaResult.status, googleResult.status);

  const spend = campaigns.reduce((sum, row) => sum + row.spend, 0);
  const impressions = campaigns.reduce((sum, row) => sum + row.impressions, 0);
  const clicks = campaigns.reduce((sum, row) => sum + row.clicks, 0);
  const conversions = campaigns.reduce((sum, row) => sum + row.conversions, 0);
  const platformRevenue = campaigns.reduce((sum, row) => sum + row.platformRevenue, 0);
  const internalAttributedRevenue = campaigns.reduce((sum, row) => sum + row.internalRevenue, 0);

  return {
    periodLabel: PERIOD_LABEL,
    meta: metaResult.status,
    google: googleResult.status,
    spend,
    impressions,
    clicks,
    conversions,
    platformRevenue,
    internalAttributedRevenue,
    cpc: rate(spend, clicks),
    cpm: rate(spend * 1000, impressions),
    ctr: rate(clicks, impressions),
    roas: rate(platformRevenue || internalAttributedRevenue, spend),
    campaigns,
  };
}
