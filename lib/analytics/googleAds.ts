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
  phone?: string;
};

// Normalize phone to E.164 format expected by gtag enhanced conversions
const normalizePhoneE164 = (phone?: string): string | undefined => {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (digits.length > 10) return `+${digits}`;
  return undefined;
};

export const trackGoogleAdsConversion = ({
  sendToLabel,
  value,
  currency = "INR",
  transactionId,
  phone,
}: GoogleAdsConversionParams) => {
  if (!isBrowser() || typeof window.gtag !== "function") {
    return;
  }

  const payload: Record<string, unknown> = {
    send_to: `${GOOGLE_ADS_ID}/${sendToLabel}`,
  };

  if (typeof value === "number" && Number.isFinite(value)) {
    payload.value = value;
    payload.currency = currency;
  }

  if (transactionId) {
    payload.transaction_id = transactionId;
  }

  const normalizedPhone = normalizePhoneE164(phone);
  if (normalizedPhone) {
    payload.user_data = { phone_number: normalizedPhone };
  }

  window.gtag("event", "conversion", payload);
};

export const trackGoogleAdsBookingConversion = (value: number, phone?: string) =>
  trackGoogleAdsConversion({
    sendToLabel: GOOGLE_ADS_BOOKING_LABEL,
    value,
    currency: "INR",
    phone,
  });

export const trackGoogleAdsPurchaseConversion = (
  value: number,
  transactionId: string,
  phone?: string
) =>
  trackGoogleAdsConversion({
    sendToLabel: GOOGLE_ADS_PURCHASE_LABEL,
    value,
    currency: "INR",
    transactionId,
    phone,
  });
