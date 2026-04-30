export const GOOGLE_ADS_ID = "AW-18128160606";
export const GOOGLE_ADS_BOOKING_LABEL = "s9OYCI6dkaUcEN6Ol8RD";
export const GOOGLE_ADS_PURCHASE_LABEL = "-ts4CL2FqaUcEN6Ol8RD";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const isBrowser = () => typeof window !== "undefined";

type GoogleAdsConversionParams = {
  sendToLabel: string;
  value?: number;
  currency?: string;
  transactionId?: string;
};

export const trackGoogleAdsConversion = ({
  sendToLabel,
  value,
  currency = "INR",
  transactionId,
}: GoogleAdsConversionParams) => {
  if (!isBrowser() || typeof window.gtag !== "function") {
    return;
  }

  const payload: Record<string, string | number> = {
    send_to: `${GOOGLE_ADS_ID}/${sendToLabel}`,
  };

  if (typeof value === "number" && Number.isFinite(value)) {
    payload.value = value;
    payload.currency = currency;
  }

  if (transactionId) {
    payload.transaction_id = transactionId;
  }

  window.gtag("event", "conversion", payload);
};

export const trackGoogleAdsBookingConversion = (value: number) =>
  trackGoogleAdsConversion({
    sendToLabel: GOOGLE_ADS_BOOKING_LABEL,
    value,
    currency: "INR",
  });

export const trackGoogleAdsPurchaseConversion = (
  value: number,
  transactionId: string
) =>
  trackGoogleAdsConversion({
    sendToLabel: GOOGLE_ADS_PURCHASE_LABEL,
    value,
    currency: "INR",
    transactionId,
  });
