"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock3,
  Check,
  CreditCard,
  Droplets,
  Heart,
  Landmark,
  Loader2,
  MapPin,
  MessageCircle,
  Scissors,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Upload,
  Wallet,
  Wind,
  X,
  Zap,
} from "lucide-react";
import {
  getServicePrice,
  INDIVIDUAL_SESSION_SERVICES,
  SLOT_BLOCK_DEPOSIT_AMOUNT,
  SUPPORTED_CITIES,
} from "../../../lib/booking/constants";
import { getBreedSuggestions, normalizeBreedName } from "../../../lib/pets/breeds";
import { buildBookingEventId, buildServiceMeta, trackMetaEvent } from "../../../lib/analytics/metaPixel";
import { trackGoogleAdsBookingConversion, trackGoogleAdsPurchaseConversion } from "../../../lib/analytics/googleAds";
import { whatsappHref } from "../../../lib/seo/businessInfo";
import { useBookingAnalytics } from "./hooks/useBookingAnalytics";
import { formatCurrency, formatDateLabel, getTodayDateInputValue } from "./utils/bookingFormatters";
import { hasMeaningfulBookingInput, isValidIndianMobile } from "./utils/bookingValidation";

type BookingStep =
  | "plan"
  | "slot"
  | "details"
  | "review"
  | "confirmation";

type BookingWindow = {
  bookingWindowId: string;
  slotIds: string[];
  slotLabels: string[];
  displayLabel: string;
  teamName: string;
  petCount: number;
};

type AvailabilityDate = {
  date: string;
  totalBookingWindows: number;
  bookingWindows: BookingWindow[];
};

type BookingPet = {
  id: string;
  name: string;
  breed: string;
  stylingNotes: string;
  groomingNotes: string;
  temperament: "sweet_soul" | "wiggle_worrier" | "spicy_spark" | "";
  stylingAssets: BookingCreateAssetInput[];
  sourcePetId?: string;
  isSavedProfile?: boolean;
  imageUrl?: string | null;
  species?: "dog" | "cat" | "unknown";
};

type BookingCreateAssetInput = {
  storageKey: string;
  publicUrl: string;
  originalName: string;
};

type SavedPetLookupItem = {
  petId: string;
  name: string | null;
  breed: string;
  imageUrl: string | null;
  species: "dog" | "cat" | "unknown";
  lastBookedAt: string | null;
  defaultGroomingNotes: string | null;
  defaultStylingNotes: string | null;
  temperament?: BookingPet["temperament"];
};

type SavedServiceAddress = {
  serviceAddress: string;
  serviceLandmark: string;
  servicePincode: string;
  serviceLocationUrl: string;
  serviceLat?: number | null;
  serviceLng?: number | null;
  serviceLocationSource?: string | null;
  addressUpdatedAt?: string | null;
};

type BookingCreateResponse = {
  success: true;
  bookingId: string;
  accessToken: string;
  status: string;
  paymentStatus: string;
  paymentMethod: "pay_now" | "pay_after_service";
  originalAmount: number;
  finalAmount: number;
  selectedDate: string;
  bookingWindowId: string;
  addressStatus: "missing" | "partial" | "complete";
  serviceAddress: string;
  serviceLandmark: string;
  servicePincode: string;
  serviceLocationUrl: string;
  serviceLat?: number | null;
  serviceLng?: number | null;
  serviceLocationSource?: string | null;
  paymentOrder?: {
    orderId: string;
    amount: number;
    currency: string;
  } | null;
  loyalty?: {
    rewardApplied: boolean;
    completedCountBefore: number;
    completedCountAfter: number | null;
    sessionsInCurrentCycleBefore: number | null;
    sessionsInCurrentCycleAfter: number | null;
    remainingToFreeBeforeBooking: number;
    remainingToFreeAfterBooking: number | null;
  };
};

type LocationCaptureStatus = {
  tone: "idle" | "success" | "error";
  message: string;
};

type BookingAddOn = {
  id: string;
  name: string;
  price: number;
  group: string;
  description: string;
  icon: string;
  imageSrc: string;
};

type RazorpayCheckoutMethod = "upi" | "card" | "netbanking" | "wallet";

type RazorpayPaymentSuccessResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayFailureResponse = {
  error?: {
    description?: string | null;
  } | null;
};

type RazorpayInstance = {
  open: () => void;
  on: (
    event: "payment.failed",
    handler: (response: RazorpayFailureResponse) => void | Promise<void>
  ) => void;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  handler: (response: RazorpayPaymentSuccessResponse) => void | Promise<void>;
  modal?: {
    ondismiss?: () => void | Promise<void>;
  };
  prefill?: {
    name?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  config?: {
    display?: {
      sequence?: string[];
      preferences?: {
        show_default_blocks?: boolean;
      };
    };
  };
  theme?: {
    color: string;
  };
};

type RazorpayConstructor = new (options: RazorpayOptions) => RazorpayInstance;

const STEP_ORDER: BookingStep[] = ["plan", "slot", "details", "review", "confirmation"];
const SUPPORT_WHATSAPP = whatsappHref;
const ADD_ONS: BookingAddOn[] = [
  {
    id: "anti_tick_bath",
    name: "Anti-Tick Bath",
    price: 399,
    group: "Anti-tick care",
    description: "Medicated bath support for tick-prone coats.",
    icon: "anti_tick",
    imageSrc: "/booking-addons/anti-tick-bath.png",
  },
  {
    id: "tick_collar",
    name: "Tick Collar",
    price: 699,
    group: "Anti-tick care",
    description: "Protective collar added after grooming.",
    icon: "collar",
    imageSrc: "/booking-addons/tick-collar.png",
  },
  {
    id: "gland_cleaning",
    name: "Gland Cleaning",
    price: 299,
    group: "Hygiene add-on",
    description: "Anal gland cleaning by the grooming team.",
    icon: "gland",
    imageSrc: "/booking-addons/gland-cleaning.png",
  },
];

const POPULAR_BREEDS = [
  "Shih Tzu",
  "Pomeranian",
  "Lhasa Apso",
  "Golden Retriever",
  "Indie",
] as const;

const AVAILABLE_COUPONS: Array<{ code: string; description: string }> = [
  { code: "WELCOME10", description: "10% off your first online-paid booking." },
  { code: "FLAT200", description: "Flat ₹200 off when you pay online." },
];

const RAZORPAY_METHODS: Array<{
  id: RazorpayCheckoutMethod;
  label: string;
  helper: string;
  icon: React.ElementType;
}> = [
  { id: "upi", label: "UPI", helper: "GPay, PhonePe, Paytm or any UPI app", icon: Smartphone },
  { id: "card", label: "Card", helper: "Credit and debit cards", icon: CreditCard },
  { id: "netbanking", label: "Netbanking", helper: "Pay directly from bank", icon: Landmark },
  { id: "wallet", label: "Wallet", helper: "Enabled Razorpay wallets", icon: Wallet },
];

const createPet = (): BookingPet => ({
  id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `pet_${Date.now()}`,
  name: "",
  breed: "",
  stylingNotes: "",
  groomingNotes: "",
  temperament: "",
  stylingAssets: [],
});

const normalizePhoneForLookup = (value: string) => value.replace(/\D/g, "").slice(-10);

const AVATAR_GRADIENTS = [
  "from-[#f6f2ff] to-[#e9defa]",
  "from-[#fff6ef] to-[#fde2c8]",
  "from-[#eef7f2] to-[#cbe9d8]",
  "from-[#eef6ff] to-[#cce3ff]",
  "from-[#fff0f0] to-[#fcd6d6]",
  "from-[#fdf6ff] to-[#ead4f5]",
];

const getAvatarGradient = (seed: string) => {
  const source = (seed || "pet").toLowerCase();
  const hash = source.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
};

const getAvatarLetter = (...candidates: Array<string | null | undefined>) => {
  for (const value of candidates) {
    const trimmed = (value || "").trim();
    if (trimmed) return trimmed.charAt(0).toUpperCase();
  }
  return "P";
};

const getErrorMessage = (data: unknown, fallback: string) => {
  if (data && typeof data === "object" && "error" in data && typeof data.error === "string") {
    return data.error;
  }

  return fallback;
};

const getSlotStartLabel = (displayLabel?: string | null) => {
  if (!displayLabel) return "Slot";
  if (displayLabel.toLowerCase().includes("full day")) return "Full day";
  return displayLabel.split(/[–-]/)[0]?.trim() || displayLabel;
};

const getPackageVisual = (serviceName: string) => {
  if (serviceName === "Complete Pampering") {
    return {
      icon: Sparkles,
      badge: "Best Experience",
      badgeClass: "bg-[#fff1e8] text-[#b84f19] ring-[#ffd7bd]",
      iconClass: "bg-[#fff3e8] text-[#d85e22]",
      selectedClass:
        "border-[#6d5bd0] bg-[linear-gradient(180deg,#fffaf5_0%,#ffffff_46%,#f5f1ff_100%)] shadow-[0_24px_64px_rgba(82,61,166,0.18)]",
      baseClass: "border-[#eadfff] bg-white shadow-[0_14px_42px_rgba(84,57,170,0.07)]",
      accent: "from-[#ff8a3d] via-[#f4c7a4] to-[#6d5bd0]",
      footerClass: "bg-[#fff6ef] text-[#8a4b1f]",
      cta: "Choose Complete Care",
      includes:
        "Includes nail trim, ear cleaning, dental care, paw butter and perfume finish.",
    };
  }

  if (serviceName === "Signature Care") {
    return {
      icon: Scissors,
      badge: "Most Booked",
      badgeClass: "bg-[#eef7f2] text-[#14724f] ring-[#c9eadb]",
      iconClass: "bg-[#eef7f2] text-[#14724f]",
      selectedClass:
        "border-[#14724f] bg-[linear-gradient(180deg,#fbfffd_0%,#ffffff_48%,#f3faf6_100%)] shadow-[0_22px_58px_rgba(20,114,79,0.14)]",
      baseClass: "border-[#dfece7] bg-white shadow-[0_14px_38px_rgba(31,72,58,0.06)]",
      accent: "from-[#14724f] via-[#a9dcc8] to-[#6d5bd0]",
      footerClass: "bg-[#f0f8f4] text-[#145b43]",
      cta: "Choose Signature Care",
      includes: "Hygiene haircut only. Full body haircut is not included.",
    };
  }

  return {
    icon: Droplets,
    badge: "Bath Only",
    badgeClass: "bg-[#eef6ff] text-[#215d9a] ring-[#cce3ff]",
    iconClass: "bg-[#eef6ff] text-[#215d9a]",
    selectedClass:
      "border-[#2f6fa3] bg-[linear-gradient(180deg,#fbfdff_0%,#ffffff_48%,#f0f7ff_100%)] shadow-[0_18px_46px_rgba(47,111,163,0.12)]",
    baseClass: "border-[#dce8f5] bg-[#fdfefe] shadow-[0_12px_34px_rgba(47,111,163,0.05)]",
    accent: "from-[#2f6fa3] via-[#b7d7f0] to-[#6d5bd0]",
    footerClass: "bg-[#f0f7ff] text-[#215d9a]",
    cta: "Choose Essential Care",
    includes: "No haircut included. Best for a quick hygiene refresh.",
  };
};

const loadRazorpayScript = () =>
  new Promise<boolean>((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    const checkoutWindow = window as Window & { Razorpay?: RazorpayConstructor };
    if (checkoutWindow.Razorpay) return resolve(true);

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true), { once: true });
      existingScript.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

function StepShell({
  step,
  title,
  subtitle,
  children,
  footer,
  onBack,
  onClose,
  busy = false,
}: {
  step: BookingStep;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  onBack: () => void;
  onClose: () => void;
  busy?: boolean;
}) {
  const currentIndex = STEP_ORDER.indexOf(step);
  const visibleStepCount = STEP_ORDER.length - 1;
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "auto" });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [step]);

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[860px] flex-col bg-[#fcfbff] text-[#211c35] md:my-6 md:min-h-[min(920px,94dvh)] md:overflow-hidden md:rounded-[28px] md:border md:border-[#e7defa] md:shadow-[0_24px_70px_rgba(34,22,74,0.14)]">
      <header className="sticky top-0 z-30 border-b border-[#eee8fb] bg-white/94 px-4 pb-4 pt-[calc(14px+env(safe-area-inset-top))] backdrop-blur md:px-6 md:pt-5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            disabled={busy}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e8e0f8] bg-white text-[#241b4b] disabled:cursor-not-allowed disabled:opacity-45"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9088b8]">
            {Math.min(currentIndex + 1, visibleStepCount)} of {visibleStepCount}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e8e0f8] bg-white text-[#241b4b] disabled:cursor-not-allowed disabled:opacity-45"
            aria-label="Close booking"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          {STEP_ORDER.slice(0, -1).map((item, index) => (
            <div
              key={item}
              className={`h-1 flex-1 rounded-full transition-colors ${
                index <= currentIndex ? "bg-[#6d5bd0]" : "bg-[#ece6f7]"
              }`}
            />
          ))}
        </div>
        <div className="mt-5">
          <h1 className="text-[28px] font-black leading-[1.05] tracking-[-0.035em] text-[#241b4b] md:text-[34px]">
            {title}
          </h1>
          <p className="mt-2 text-[15px] leading-[1.55] text-[#6b7280]">{subtitle}</p>
        </div>
      </header>

      <div ref={contentRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-20 pt-5 md:px-6">{children}</div>
      <footer className="sticky bottom-0 z-30 border-t border-[#e9e1ff] bg-white/95 px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 backdrop-blur md:px-6">
        {footer}
      </footer>
    </div>
  );
}

function PrimaryButton({
  children,
  disabled,
  loading,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      className="flex h-[54px] w-full items-center justify-center gap-2 rounded-[16px] bg-[#6d5bd0] text-[15px] font-bold text-white shadow-[0_12px_28px_rgba(109,91,208,0.22)] disabled:cursor-not-allowed disabled:opacity-55"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-[13px] font-medium text-[#5f5878]">{children}</label>;
}

const slugifyServiceName = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

function SelectField({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative mt-2">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-[52px] w-full appearance-none rounded-[16px] border border-[#ded7f1] bg-white px-4 pr-11 text-[15px] font-semibold text-[#272238] outline-none focus:border-[#6d5bd0]"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a80b8]" />
    </div>
  );
}

export function NewMobileBookingFlow({ embedded = false }: { embedded?: boolean }) {
  const trackBookingEvent = useBookingAnalytics();
  const [step, setStep] = useState<BookingStep>("plan");
  const [serviceName, setServiceName] = useState("");
  const [city, setCity] = useState("");
  const [selectedDate, setSelectedDate] = useState(getTodayDateInputValue());
  const [availabilityDates, setAvailabilityDates] = useState<AvailabilityDate[]>([]);
  const [selectedBookingWindowId, setSelectedBookingWindowId] = useState("");
  const [selectedDateForSlots, setSelectedDateForSlots] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pets, setPets] = useState<BookingPet[]>([createPet()]);
  const [paymentMethod, setPaymentMethod] = useState<"pay_now" | "pay_after_service">("pay_now");
  const [checkoutMethod, setCheckoutMethod] = useState<RazorpayCheckoutMethod>("upi");
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [serviceAddress, setServiceAddress] = useState("");
  const [serviceLandmark, setServiceLandmark] = useState("");
  const [servicePincode, setServicePincode] = useState("");
  const [serviceLocationUrl, setServiceLocationUrl] = useState("");
  const [serviceLat, setServiceLat] = useState<number | null>(null);
  const [serviceLng, setServiceLng] = useState<number | null>(null);
  const [savedServiceAddress, setSavedServiceAddress] = useState<SavedServiceAddress | null>(null);
  const [addressEditing, setAddressEditing] = useState(true);
  const [locationCapturing, setLocationCapturing] = useState(false);
  const [locationCaptureStatus, setLocationCaptureStatus] = useState<LocationCaptureStatus>({
    tone: "idle",
    message: "",
  });
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState("");
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [savedPetsLoading, setSavedPetsLoading] = useState(false);
  const [savedPetsError, setSavedPetsError] = useState("");
  const [savedPetsLookupDoneForPhone, setSavedPetsLookupDoneForPhone] = useState("");
  const [savedPets, setSavedPets] = useState<SavedPetLookupItem[]>([]);
  const [selectedSavedPetIds, setSelectedSavedPetIds] = useState<string[]>([]);
  const [inclusionsPackage, setInclusionsPackage] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<BookingCreateResponse | null>(null);
  const [pendingPayment, setPendingPayment] = useState<{
    booking: BookingCreateResponse;
    message: string;
  } | null>(null);
  const openedTrackedRef = useRef(false);
  const lastTrackedStepRef = useRef<BookingStep | null>(null);

  const selectedBookingWindow = availabilityDates
    .find((item) => item.date === selectedDateForSlots)
    ?.bookingWindows.find((window) => window.bookingWindowId === selectedBookingWindowId);
  const selectedAddOns = ADD_ONS.filter((addOn) => selectedAddOnIds.includes(addOn.id));
  const packageAmount = serviceName ? getServicePrice(serviceName) * pets.length : 0;
  const addOnsAmount = selectedAddOns.reduce((total, addOn) => total + addOn.price, 0);
  const originalAmount = packageAmount + addOnsAmount;
  const finalAmount = Math.max(0, originalAmount - couponDiscount);
  const discountAmount = originalAmount - finalAmount;
  const serviceChanged = Boolean(serviceName);

  const commonEventPayload = useMemo(() => ({
    packageName: serviceName,
    city,
    selectedDate,
    selectedWindow: selectedBookingWindow?.displayLabel,
    petCount: pets.length,
    paymentMethod,
    amount: finalAmount,
  }), [
    city,
    finalAmount,
    paymentMethod,
    pets.length,
    selectedBookingWindow?.displayLabel,
    selectedDate,
    serviceName,
  ]);

  useEffect(() => {
    if (lastTrackedStepRef.current === step) return;
    lastTrackedStepRef.current = step;
    trackBookingEvent("booking_step_viewed", { ...commonEventPayload, step });
  }, [commonEventPayload, step, trackBookingEvent]);

  useEffect(() => {
    if (openedTrackedRef.current) return;
    openedTrackedRef.current = true;
    trackBookingEvent("booking_opened", commonEventPayload);
  }, [commonEventPayload, trackBookingEvent]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const serviceParam = params.get("service") || params.get("package");
    if (!serviceParam) return;

    const matched = INDIVIDUAL_SESSION_SERVICES.find(
      (service) => slugifyServiceName(service.name) === serviceParam.toLowerCase()
    );
    if (matched) setServiceName(matched.name);
  }, []);

  const goToStep = (nextStep: BookingStep) => {
    if (nextStep === "review") {
      trackBookingEvent("review_booking_viewed", commonEventPayload);
    }
    setStep(nextStep);
    setError("");
  };

  const savedPetsAbortRef = useRef<AbortController | null>(null);

  const fetchSavedPetsByPhone = useCallback(async (rawPhone: string) => {
    const lookupPhone = normalizePhoneForLookup(rawPhone);

    if (lookupPhone.length < 10) {
      savedPetsAbortRef.current?.abort();
      setSavedPets([]);
      setSavedPetsError("");
      setSavedPetsLookupDoneForPhone("");
      if (savedServiceAddress) {
        setServiceAddress("");
        setServiceLandmark("");
        setServicePincode("");
        setServiceLocationUrl("");
        setServiceLat(null);
        setServiceLng(null);
      }
      setSavedServiceAddress(null);
      setAddressEditing(true);
      setSelectedSavedPetIds([]);
      setPets((prev) =>
        prev.map((pet) =>
          pet.sourcePetId
            ? {
                ...pet,
                name: "",
                breed: "",
                stylingNotes: "",
                groomingNotes: "",
                temperament: "",
                stylingAssets: [],
                sourcePetId: undefined,
                isSavedProfile: false,
                imageUrl: null,
                species: undefined,
              }
            : pet
        )
      );
      return;
    }

    if (savedPetsLookupDoneForPhone === lookupPhone) return;

    savedPetsAbortRef.current?.abort();
    const controller = new AbortController();
    savedPetsAbortRef.current = controller;

    setSavedPetsLoading(true);
    setSavedPetsError("");

    try {
      const response = await fetch(`/api/pets/by-phone?phone=${encodeURIComponent(lookupPhone)}`, {
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "Could not check saved companions for this number."));
      }

      const lookupPets = Array.isArray(data?.pets) ? (data.pets as SavedPetLookupItem[]) : [];
      const activePets = lookupPets.filter((pet) => pet.petId);
      const lookupAddress =
        data?.savedAddress && typeof data.savedAddress === "object"
          ? (data.savedAddress as SavedServiceAddress)
          : null;
      setSavedPets(activePets);
      setSavedServiceAddress(lookupAddress);
      if (lookupAddress?.serviceAddress?.trim()) {
        setServiceAddress(lookupAddress.serviceAddress || "");
        setServiceLandmark(lookupAddress.serviceLandmark || "");
        setServicePincode(lookupAddress.servicePincode || "");
        setServiceLocationUrl(lookupAddress.serviceLocationUrl || "");
        setServiceLat(typeof lookupAddress.serviceLat === "number" ? lookupAddress.serviceLat : null);
        setServiceLng(typeof lookupAddress.serviceLng === "number" ? lookupAddress.serviceLng : null);
        setAddressEditing(false);
        setLocationCaptureStatus(
          lookupAddress.serviceLocationUrl
            ? { tone: "success", message: "Saved location pin is ready for this visit." }
            : { tone: "idle", message: "" }
        );
      } else {
        if (savedServiceAddress) {
          setServiceAddress("");
          setServiceLandmark("");
          setServicePincode("");
          setServiceLocationUrl("");
          setServiceLat(null);
          setServiceLng(null);
          setLocationCaptureStatus({ tone: "idle", message: "" });
        }
        setAddressEditing(true);
      }
      setSavedPetsLookupDoneForPhone(lookupPhone);
      setSelectedSavedPetIds((prev) => prev.filter((petId) => activePets.some((pet) => pet.petId === petId)));
      setPets((prev) =>
        prev.map((pet) =>
          pet.sourcePetId && !activePets.some((activePet) => activePet.petId === pet.sourcePetId)
            ? {
                ...pet,
                name: "",
                breed: "",
                stylingNotes: "",
                groomingNotes: "",
                temperament: "",
                stylingAssets: [],
                sourcePetId: undefined,
                isSavedProfile: false,
                imageUrl: null,
                species: undefined,
              }
            : pet
        )
      );
    } catch (lookupError) {
      if (lookupError instanceof DOMException && lookupError.name === "AbortError") {
        return;
      }
      const message =
        lookupError instanceof Error
          ? lookupError.message
          : "Could not check saved companions for this number.";
      setSavedPets([]);
      setSavedPetsError(message);
      setSavedPetsLookupDoneForPhone("");
    } finally {
      if (savedPetsAbortRef.current === controller) {
        setSavedPetsLoading(false);
        savedPetsAbortRef.current = null;
      }
    }
  }, [savedPetsLookupDoneForPhone, savedServiceAddress]);

  useEffect(() => {
    return () => {
      savedPetsAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (step !== "details") return;
    const lookupPhone = normalizePhoneForLookup(phone);
    if (lookupPhone.length < 10) return;

    const timer = window.setTimeout(() => {
      void fetchSavedPetsByPhone(lookupPhone);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [fetchSavedPetsByPhone, phone, step]);

  const resetFlow = () => {
    setStep("plan");
    setAvailabilityDates([]);
    setSelectedBookingWindowId("");
    setSelectedDateForSlots("");
    setConfirmedBooking(null);
    setPendingPayment(null);
    setError("");
  };

  const closeFlow = () => {
    trackBookingEvent("booking_closed", { ...commonEventPayload, step });
    if (embedded) {
      resetFlow();
      return;
    }

    window.location.href = "/";
  };

  const isBusy = bookingLoading || availabilityLoading;

  const requestClose = () => {
    if (isBusy) return;
    if (
      hasMeaningfulBookingInput({
        serviceChanged,
        city,
        selectedDate,
        selectedBookingWindowId,
        name,
        phone,
        pets,
      }) &&
      step !== "confirmation"
    ) {
      setShowExitConfirm(true);
      return;
    }

    closeFlow();
  };

  const goBack = () => {
    if (isBusy) return;
    trackBookingEvent("booking_back_clicked", { ...commonEventPayload, step });
    if (step === "plan") {
      requestClose();
      return;
    }
    if (step === "slot") goToStep("plan");
    if (step === "details") goToStep("slot");
    if (step === "review") goToStep("details");
    if (step === "confirmation") closeFlow();
  };

  const fetchAvailability = async () => {
    if (!serviceName) {
      setError("Please choose a grooming package before checking time slots.");
      return;
    }
    if (!city || !selectedDate) {
      setError("Please select your service city and visit date to continue.");
      return;
    }

    setAvailabilityLoading(true);
    setError("");
    trackBookingEvent("availability_check_started", commonEventPayload);

    try {
      const response = await fetch("/api/booking/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city,
          startDate: selectedDate,
          days: 5,
          petCount: pets.length || 1,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "Could not check available slots."));
      }

      const dates = Array.isArray(data.dates) ? data.dates : [];
      setAvailabilityDates(dates);
      const firstDateWithSlots = dates.find((item: AvailabilityDate) => item.bookingWindows?.length > 0);
      setSelectedDateForSlots(firstDateWithSlots?.date || dates[0]?.date || selectedDate);
      setSelectedBookingWindowId("");
      trackBookingEvent("availability_check_success", {
        ...commonEventPayload,
        selectedDate,
      });
      goToStep("slot");
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "Could not check available slots.";
      setError(message);
      trackBookingEvent("availability_check_failed", { ...commonEventPayload, error: message });
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const updatePet = (petId: string, patch: Partial<BookingPet>) => {
    setPets((prev) => prev.map((pet) => (pet.id === petId ? { ...pet, ...patch } : pet)));
  };

  const handleToggleSavedPet = (savedPet: SavedPetLookupItem) => {
    const isSelected = selectedSavedPetIds.includes(savedPet.petId);

    if (isSelected) {
      setSelectedSavedPetIds((prev) => prev.filter((petId) => petId !== savedPet.petId));
      setPets((prev) =>
        prev.map((pet) =>
          pet.sourcePetId === savedPet.petId
            ? {
                ...pet,
                name: "",
                breed: "",
                stylingNotes: "",
                groomingNotes: "",
                temperament: "",
                stylingAssets: [],
                sourcePetId: undefined,
                isSavedProfile: false,
                imageUrl: null,
                species: undefined,
              }
            : pet
        )
      );
      return;
    }

    const openSlot = pets.find((pet) => !pet.sourcePetId && !pet.name.trim() && !pet.breed.trim());
    if (!openSlot) {
      setError(
        `Pet count is set to ${pets.length}. To add more saved companions, go back and update pet count before checking slots.`
      );
      return;
    }

    setSelectedSavedPetIds((prev) => [...prev, savedPet.petId]);
    setPets((prev) =>
      prev.map((pet) =>
        pet.id === openSlot.id
          ? {
              ...pet,
              sourcePetId: savedPet.petId,
              isSavedProfile: true,
              name: savedPet.name || "",
              breed: savedPet.breed || "",
              stylingNotes: savedPet.defaultStylingNotes || "",
              groomingNotes: savedPet.defaultGroomingNotes || "",
              temperament: savedPet.temperament || "",
              imageUrl: savedPet.imageUrl,
              species: savedPet.species,
            }
          : pet
      )
    );
    setError("");
  };

  const setPetCount = (count: number) => {
    setPets((prev) => {
      if (count > prev.length) {
        return [...prev, ...Array.from({ length: count - prev.length }, () => createPet())];
      }

      const trimmed = prev.slice(0, count);
      const survivingSavedIds = new Set(
        trimmed.map((pet) => pet.sourcePetId).filter((id): id is string => Boolean(id))
      );
      setSelectedSavedPetIds((current) => current.filter((petId) => survivingSavedIds.has(petId)));
      return trimmed;
    });
  };

  const validateDetails = () => {
    if (name.trim().length < 2) {
      return "Please add your full name so our team knows who to coordinate with.";
    }
    if (!isValidIndianMobile(phone)) {
      return "Please add a valid Indian mobile number for booking updates.";
    }
    if (!pets.every((pet) => pet.breed.trim())) {
      return "Please add your pet's breed so our team can prepare properly.";
    }
    if (serviceAddress.trim().length < 8) {
      return "Please add your full service address before review.";
    }
    if (!servicePincode.trim() && !serviceLocationUrl.trim()) {
      return "Please add a pincode or use current location so the groomer can navigate.";
    }

    setPets((prev) =>
      prev.map((pet) => {
        const normalized = normalizeBreedName(pet.breed);
        return normalized === pet.breed ? pet : { ...pet, breed: normalized };
      })
    );

    return "";
  };

  const previewCoupon = async (overrideCode?: string) => {
    const code = (overrideCode ?? couponCode).trim();
    if (!code) {
      setCouponDiscount(0);
      setCouponMessage("");
      return;
    }
    if (overrideCode) {
      setCouponCode(overrideCode.toUpperCase());
    }

    setCouponLoading(true);
    setCouponMessage("");

    try {
      const response = await fetch("/api/booking/coupons/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceName,
          city,
          phone,
          paymentMethod,
          petCount: pets.length,
          originalAmount,
          couponCode: code,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || data?.valid === false) {
        setCouponDiscount(0);
        setCouponMessage(getErrorMessage(data, data?.error || "Coupon is not available."));
        return;
      }

      const discount = Math.max(0, Number(data?.totalDiscount || 0));
      setCouponDiscount(discount);
      setCouponCode(String(data?.normalizedCouponCode || code));
      setCouponMessage(discount > 0 ? `Coupon applied. You saved ${formatCurrency(discount)}.` : "Coupon applied.");
    } catch (couponError) {
      setCouponDiscount(0);
      setCouponMessage(couponError instanceof Error ? couponError.message : "Could not apply coupon.");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleCaptureLocation = async () => {
    try {
      setLocationCapturing(true);
      setError("");
      setLocationCaptureStatus({
        tone: "idle",
        message: "Requesting location permission...",
      });
      if (!navigator.geolocation) {
        throw new Error("Location capture is not supported on this browser.");
      }
      if (typeof window !== "undefined" && !window.isSecureContext) {
        throw new Error("Location capture needs HTTPS on mobile browsers. Use the secure preview link or enter the address manually.");
      }
      if ("permissions" in navigator && typeof navigator.permissions?.query === "function") {
        try {
          const permission = await navigator.permissions.query({ name: "geolocation" as PermissionName });
          if (permission.state === "denied") {
            throw new Error("Location access is blocked. Enable location permission for alltails.in in your browser settings, or paste a Google Maps link.");
          }
        } catch (permissionError) {
          if (permissionError instanceof Error && permissionError.message.includes("blocked")) {
            throw permissionError;
          }
        }
      }
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 60_000,
        });
      });
      const lat = Number(position.coords.latitude.toFixed(7));
      const lng = Number(position.coords.longitude.toFixed(7));
      setServiceLat(lat);
      setServiceLng(lng);
      setServiceLocationUrl(`https://www.google.com/maps?q=${lat},${lng}`);
      setLocationCaptureStatus({
        tone: "success",
        message: "Location pin captured. Please keep your house / flat details in the address field.",
      });
    } catch (captureError) {
      let message = "Could not capture location. Please allow location access or paste a Google Maps link.";
      const geolocationErrorCode =
        typeof captureError === "object" && captureError !== null && "code" in captureError
          ? Number((captureError as { code?: unknown }).code)
          : null;
      if (geolocationErrorCode) {
        if (geolocationErrorCode === 1) {
          message = "Location permission was denied. Enable it for alltails.in, or paste a Google Maps link.";
        } else if (geolocationErrorCode === 2) {
          message = "Your device could not detect location right now. Try again outdoors or paste a Google Maps link.";
        } else if (geolocationErrorCode === 3) {
          message = "Location capture timed out. Please try again or paste a Google Maps link.";
        }
      } else if (captureError instanceof Error) {
        message = captureError.message;
      }
      setLocationCaptureStatus({ tone: "error", message });
    } finally {
      setLocationCapturing(false);
    }
  };

  const uploadPetPhoto = async (petId: string, file: File, petIndex: number) => {
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", "styling_reference");
    formData.append("petIndex", String(petIndex));

    const response = await fetch("/api/uploads/booking-asset", {
      method: "POST",
      body: formData,
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(getErrorMessage(data, "Could not upload pet photo."));
      return;
    }

    const asset = data?.asset as BookingCreateAssetInput | undefined;
    if (!asset?.storageKey || !asset.publicUrl) {
      setError("Could not read uploaded pet photo.");
      return;
    }

    updatePet(petId, { stylingAssets: [asset] });
  };

  const openRazorpay = async (booking: BookingCreateResponse) => {
    if (!booking.paymentOrder) {
      setConfirmedBooking(booking);
      goToStep("confirmation");
      return;
    }

    const loaded = await loadRazorpayScript();
    const checkoutWindow = window as Window & { Razorpay?: RazorpayConstructor };
    if (!loaded || !checkoutWindow.Razorpay) {
      throw new Error("Online payment is unavailable right now. Please choose Pay after service or try again in a moment.");
    }

    const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!razorpayKey) {
      throw new Error("Online payment is unavailable right now. Please choose Pay after service.");
    }

    trackBookingEvent("razorpay_opened", commonEventPayload);

    const instance = new checkoutWindow.Razorpay({
      key: razorpayKey,
      amount: booking.paymentOrder.amount,
      currency: booking.paymentOrder.currency,
      name: "All Tails",
      description: "Pet grooming booking payment",
      order_id: booking.paymentOrder.orderId,
      prefill: { name, contact: phone },
      notes: { bookingId: booking.bookingId },
      config: {
        display: {
          sequence: [checkoutMethod],
          preferences: {
            show_default_blocks: false,
          },
        },
      },
      theme: { color: "#6d5bd0" },
      modal: {
        ondismiss: () => {
          const message =
            "Payment was not completed. Your booking is saved as pending, and you can retry payment from here.";
          setPendingPayment({ booking, message });
          setError("");
          trackBookingEvent("razorpay_dismissed", commonEventPayload);
        },
      },
      handler: async (response: RazorpayPaymentSuccessResponse) => {
        try {
          const verifyResponse = await fetch("/api/payment/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bookingId: booking.bookingId,
              accessToken: booking.accessToken,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          const verifyData = await verifyResponse.json().catch(() => ({}));

          if (!verifyResponse.ok) {
            throw new Error(getErrorMessage(verifyData, "Payment verification failed."));
          }

          trackGoogleAdsPurchaseConversion(booking.finalAmount, booking.bookingId, phone);
          trackMetaEvent(
            "Purchase",
            buildServiceMeta(serviceName, {
              value: booking.finalAmount,
              currency: "INR",
              city,
              selected_date: selectedDate,
              booking_window: selectedBookingWindow?.displayLabel,
              pet_count: pets.length,
              payment_method: booking.paymentMethod,
              booking_id: booking.bookingId,
            }),
            { eventID: buildBookingEventId("purchase", booking.bookingId) }
          );
          trackBookingEvent("payment_verified", commonEventPayload);
          setConfirmedBooking({ ...booking, ...verifyData });
          setPendingPayment(null);
          goToStep("confirmation");
          trackBookingEvent("booking_confirmed", commonEventPayload);
        } catch (verifyError) {
          const message =
            verifyError instanceof Error ? verifyError.message : "Payment verification failed.";
          setPendingPayment({ booking, message });
          trackBookingEvent("razorpay_failed", { ...commonEventPayload, error: message });
        }
      },
    });

    instance.on("payment.failed", (response: RazorpayFailureResponse) => {
      const message =
        response.error?.description ||
        "Payment was not completed. You can retry payment from here.";
      setPendingPayment({ booking, message });
      trackBookingEvent("razorpay_failed", { ...commonEventPayload, error: message });
    });

    instance.open();
  };

  const createBooking = async () => {
    if (!selectedBookingWindow) {
      setError("Please select a visit window to continue.");
      goToStep("slot");
      return;
    }

    const detailsError = validateDetails();
    if (detailsError) {
      setError(detailsError);
      goToStep("details");
      return;
    }

    setBookingLoading(true);
    setError("");
    trackBookingEvent("booking_create_started", commonEventPayload);

    try {
      const response = await fetch("/api/booking/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          city,
          serviceName,
          selectedDate: selectedDateForSlots || selectedDate,
          bookingWindowId: selectedBookingWindow.bookingWindowId,
          slotIds: selectedBookingWindow.slotIds,
          paymentMethod,
          checkoutMethod,
          couponCode: paymentMethod === "pay_now" ? couponCode : "",
          addOns: selectedAddOns.map((addOn) => ({
            id: addOn.id,
            name: addOn.name,
            price: addOn.price,
          })),
          finalAmount,
          serviceAddress,
          serviceLandmark,
          servicePincode,
          serviceLocationUrl,
          serviceLat,
          serviceLng,
          serviceLocationSource:
            serviceLat !== null && serviceLng !== null
              ? "browser_geolocation"
              : serviceLocationUrl.trim()
                ? "manual_maps_link"
                : "",
          pets: pets.map((pet) => ({
            sourcePetId: pet.sourcePetId,
            isSavedProfile: Boolean(pet.sourcePetId),
            name: pet.name.trim(),
            breed: normalizeBreedName(pet.breed),
            temperament: pet.temperament,
            stylingNotes: pet.stylingNotes.trim(),
            groomingNotes: pet.groomingNotes.trim(),
            stylingAssets: pet.stylingAssets,
            concernAssets: [],
          })),
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "Could not create booking."));
      }

      const booking = data as BookingCreateResponse;
      trackGoogleAdsBookingConversion(booking.finalAmount, phone);
      trackMetaEvent(
        "Lead",
        buildServiceMeta(serviceName, {
          value: booking.finalAmount,
          currency: "INR",
          city,
          selected_date: selectedDateForSlots || selectedDate,
          booking_window: selectedBookingWindow.displayLabel,
          pet_count: pets.length,
          payment_method: booking.paymentMethod,
          booking_id: booking.bookingId,
        }),
        { eventID: buildBookingEventId("lead", booking.bookingId) }
      );
      trackBookingEvent("booking_create_success", commonEventPayload);

      // Both pay_now and pay_after_service now require a Razorpay payment up
      // front (full amount vs slot-blocking deposit). Loyalty / zero-amount
      // pay_now bookings come back without a paymentOrder and skip checkout.
      if (booking.paymentOrder) {
        await openRazorpay(booking);
      } else {
        setConfirmedBooking(booking);
        goToStep("confirmation");
        trackBookingEvent("booking_confirmed", commonEventPayload);
      }
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : "Could not create booking.";
      setError(message);
      trackBookingEvent("booking_create_failed", { ...commonEventPayload, error: message });
    } finally {
      setBookingLoading(false);
    }
  };

  const renderFooter = () => {
    if (step === "plan") {
      const disabled = !serviceName || !city || !selectedDate;
      return (
        <PrimaryButton disabled={disabled} loading={availabilityLoading} onClick={fetchAvailability}>
          {disabled ? "Choose package, city and date" : "See available time slots"}
        </PrimaryButton>
      );
    }

    if (step === "slot") {
      return (
        <PrimaryButton disabled={!selectedBookingWindow} onClick={() => goToStep("details")}>
          {selectedBookingWindow ? `Continue with ${getSlotStartLabel(selectedBookingWindow.displayLabel)}` : "Select a slot"}
        </PrimaryButton>
      );
    }

    if (step === "details") {
      return (
        <PrimaryButton
          onClick={() => {
            const message = validateDetails();
            if (message) {
              setError(message);
              return;
            }
            setError("");
            goToStep("review");
          }}
        >
          Review booking
        </PrimaryButton>
      );
    }

    if (step === "review") {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-[18px] border border-[#eee8fb] bg-[#fbfaff] px-4 py-3.5">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f86aa]">Pay using</div>
              <div className="mt-1 text-[14px] font-semibold text-[#241b4b]">
                {paymentMethod === "pay_now" ? "Pay now" : "Pay after service"}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f86aa]">
                {paymentMethod === "pay_after_service" ? "Pay now" : "Total"}
              </div>
              <div className="mt-1 text-[20px] font-black text-[#241b4b]">
                {formatCurrency(paymentMethod === "pay_after_service" ? SLOT_BLOCK_DEPOSIT_AMOUNT : finalAmount)}
              </div>
            </div>
          </div>
          <PrimaryButton loading={bookingLoading} onClick={createBooking}>
            {bookingLoading
              ? "Opening secure payment..."
              : paymentMethod === "pay_now"
                ? `Pay ${formatCurrency(finalAmount)}`
                : `Pay ${formatCurrency(SLOT_BLOCK_DEPOSIT_AMOUNT)} to block your slot`}
          </PrimaryButton>
        </div>
      );
    }

    return <PrimaryButton onClick={closeFlow}>Done</PrimaryButton>;
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f8f5ff_0%,#ffffff_44%,#fbfbff_100%)] md:px-4 md:py-4">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[120px] -top-[140px] h-[420px] w-[420px] rounded-full bg-[#e9defa] opacity-70 blur-[110px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-[180px] -left-[140px] h-[460px] w-[460px] rounded-full bg-[#fff0e3] opacity-50 blur-[120px]"
      />
      <div className="pointer-events-none absolute right-6 top-6 z-20 hidden md:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/doodles.PNG" alt="" className="h-16 w-16 opacity-30" />
      </div>
      <div className="relative z-10">
      <StepShell
        step={step}
        title={
          step === "plan"
            ? "Plan your grooming visit"
            : step === "slot"
              ? "Choose a slot"
              : step === "details"
                ? "Your details"
                : step === "review"
                  ? "Review and pay"
                  : "Booking confirmed"
        }
        subtitle={
          step === "plan"
            ? "Pick the package, city, date and pet count together so the slots match your visit."
            : step === "slot"
              ? `${serviceName} · ${city || "Service city"}`
              : step === "details"
                ? "Tell us who we're grooming and how to reach you."
                : step === "review"
                  ? "Choose add-ons and complete the payment."
                  : "Your grooming session is reserved. Our team will coordinate final visit details shortly."
        }
        onBack={goBack}
        onClose={requestClose}
        busy={isBusy}
        footer={renderFooter()}
      >
        {pendingPayment ? (
          <PaymentRecovery
            message={pendingPayment.message}
            onRetry={() => openRazorpay(pendingPayment.booking)}
            onClose={() => setPendingPayment(null)}
          />
        ) : null}

        {error ? (
          <div className="mb-4 rounded-[16px] border border-[#ffd7d7] bg-[#fff8f8] px-4 py-3 text-[13px] leading-[1.5] text-[#b42318]">
            {error}
          </div>
        ) : null}

        {step === "plan" ? (
          <PlanStep
            serviceName={serviceName}
            city={city}
            selectedDate={selectedDate}
            petCount={pets.length}
            onViewInclusions={(name) => {
              setInclusionsPackage(name);
              trackBookingEvent("package_inclusions_viewed", { ...commonEventPayload, packageName: name });
            }}
            onServiceChange={(nextService) => {
              setServiceName(nextService);
              setAvailabilityDates([]);
              setSelectedBookingWindowId("");
              trackBookingEvent("package_selected", { ...commonEventPayload, packageName: nextService });
            }}
            onCityChange={(nextCity) => {
              setCity(nextCity);
              setAvailabilityDates([]);
              setSelectedBookingWindowId("");
              trackBookingEvent("city_selected", { ...commonEventPayload, city: nextCity });
            }}
            onDateChange={(nextDate) => {
              setSelectedDate(nextDate);
              setAvailabilityDates([]);
              setSelectedBookingWindowId("");
              trackBookingEvent("date_selected", { ...commonEventPayload, selectedDate: nextDate });
            }}
            onPetCountChange={(count) => {
              setPetCount(count);
              setAvailabilityDates([]);
              setSelectedBookingWindowId("");
            }}
          />
        ) : null}

        {step === "slot" ? (
          <SlotStep
            availabilityDates={availabilityDates}
            selectedDate={selectedDateForSlots}
            selectedBookingWindowId={selectedBookingWindowId}
            serviceName={serviceName}
            city={city}
            onDateChange={(date) => {
              setSelectedDateForSlots(date);
              setSelectedBookingWindowId("");
            }}
            onSlotChange={(window) => {
              setSelectedBookingWindowId(window.bookingWindowId);
              trackBookingEvent("slot_selected", {
                ...commonEventPayload,
                selectedDate: selectedDateForSlots,
                selectedWindow: window.displayLabel,
              });
            }}
            onRetry={fetchAvailability}
          />
        ) : null}

        {step === "details" ? (
          <DetailsStep
            name={name}
            phone={phone}
            pets={pets}
            savedPets={savedPets}
            selectedSavedPetIds={selectedSavedPetIds}
            savedPetsLoading={savedPetsLoading}
            savedPetsError={savedPetsError}
            onNameChange={setName}
            onPhoneChange={setPhone}
            onPhoneLookup={fetchSavedPetsByPhone}
            onSavedPetToggle={handleToggleSavedPet}
            onPetChange={updatePet}
            serviceName={serviceName}
            serviceAddress={serviceAddress}
            serviceLandmark={serviceLandmark}
            servicePincode={servicePincode}
            serviceLocationUrl={serviceLocationUrl}
            savedServiceAddress={savedServiceAddress}
            addressEditing={addressEditing}
            locationCaptureStatus={locationCaptureStatus}
            locationCapturing={locationCapturing}
            onAddressChange={setServiceAddress}
            onLandmarkChange={setServiceLandmark}
            onPincodeChange={setServicePincode}
            onEditAddress={() => setAddressEditing(true)}
            onLocationUrlChange={(value) => {
              setServiceLocationUrl(value);
              setServiceLat(null);
              setServiceLng(null);
              setLocationCaptureStatus(
                value.trim()
                  ? { tone: "success", message: "Location pin added. Please keep your house / flat details in the address field." }
                  : { tone: "idle", message: "" }
              );
            }}
            onCaptureLocation={handleCaptureLocation}
            onPetPhotoUpload={uploadPetPhoto}
          />
        ) : null}

        {step === "review" ? (
          <ReviewStep
            serviceName={serviceName}
            city={city}
            selectedDate={selectedDateForSlots || selectedDate}
            selectedBookingWindow={selectedBookingWindow}
            pets={pets}
            originalAmount={originalAmount}
            discountAmount={discountAmount}
            finalAmount={finalAmount}
            paymentMethod={paymentMethod}
            checkoutMethod={checkoutMethod}
            addOns={ADD_ONS}
            selectedAddOnIds={selectedAddOnIds}
            addOnsAmount={addOnsAmount}
            couponCode={couponCode}
            couponMessage={couponMessage}
            couponLoading={couponLoading}
            onEdit={goToStep}
            onCouponCodeChange={(value) => {
              setCouponCode(value.toUpperCase());
              setCouponDiscount(0);
              setCouponMessage("");
            }}
            onApplyCoupon={previewCoupon}
            onAddOnToggle={(addOnId) =>
              setSelectedAddOnIds((prev) =>
                prev.includes(addOnId) ? prev.filter((id) => id !== addOnId) : [...prev, addOnId]
              )
            }
            onPaymentChange={(method) => {
              setPaymentMethod(method);
              if (method === "pay_after_service") {
                setCouponCode("");
                setCouponDiscount(0);
                setCouponMessage("");
              }
              trackBookingEvent("payment_method_selected", { ...commonEventPayload, paymentMethod: method });
            }}
            onCheckoutMethodChange={setCheckoutMethod}
          />
        ) : null}

        {step === "confirmation" && confirmedBooking ? (
          <ConfirmationStep
            booking={confirmedBooking}
            serviceName={serviceName}
            city={city}
            selectedWindow={selectedBookingWindow?.displayLabel || ""}
            petCount={pets.length}
            customerName={name}
            pets={pets}
          />
        ) : null}

        {showExitConfirm ? (
          <ExitBookingSheet onContinue={() => setShowExitConfirm(false)} onLeave={closeFlow} />
        ) : null}

      </StepShell>
      {inclusionsPackage ? (
        <PackageInclusionsSheet
          serviceName={inclusionsPackage}
          onClose={() => setInclusionsPackage(null)}
          onChoose={() => {
            const chosen = inclusionsPackage;
            if (chosen) {
              setServiceName(chosen);
              setAvailabilityDates([]);
              setSelectedBookingWindowId("");
              trackBookingEvent("package_selected", { ...commonEventPayload, packageName: chosen });
            }
            setInclusionsPackage(null);
          }}
        />
      ) : null}
      </div>
    </div>
  );
}

function PlanStep({
  serviceName,
  city,
  selectedDate,
  petCount,
  onServiceChange,
  onCityChange,
  onDateChange,
  onPetCountChange,
  onViewInclusions,
}: {
  serviceName: string;
  city: string;
  selectedDate: string;
  petCount: number;
  onServiceChange: (serviceName: string) => void;
  onCityChange: (city: string) => void;
  onDateChange: (date: string) => void;
  onPetCountChange: (count: number) => void;
  onViewInclusions: (serviceName: string) => void;
}) {
  return (
    <div className="space-y-5">
      <PackageStep
        serviceName={serviceName}
        onServiceChange={onServiceChange}
        onViewInclusions={onViewInclusions}
      />

      <div className="rounded-[30px] border border-[#ece4f8] bg-white/92 p-5 shadow-[0_14px_36px_rgba(38,28,70,0.06)] backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[16px] font-black tracking-[-0.01em] text-[#241b4b]">Visit details</div>
            <div className="mt-1.5 text-[13px] font-medium text-[#8a82a3]">
              City, date and how many pets you&apos;re booking for.
            </div>
          </div>
        </div>
        <div className="mt-5 space-y-5">
          <ScheduleStep
            city={city}
            selectedDate={selectedDate}
            onCityChange={onCityChange}
            onDateChange={onDateChange}
          />
          <div className="border-t border-[#f0ecfa] pt-5">
            <PetCountSelector petCount={petCount} onPetCountChange={onPetCountChange} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PetCountSelector({
  petCount,
  onPetCountChange,
}: {
  petCount: number;
  onPetCountChange: (count: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <FieldLabel>How many pets?</FieldLabel>
          <div className="mt-1 text-[13px] font-medium text-[#8a82a3]">
            {petCount === 5 ? "Full-day team reserved" : `${petCount} pet${petCount > 1 ? "s" : ""} for this visit`}
          </div>
        </div>
        <div className="rounded-full bg-[#f6f2ff] px-3 py-1 text-[12px] font-semibold text-[#6d5bd0]">
          Up to 5
        </div>
      </div>
      <div className="mt-3 grid grid-cols-5 gap-1.5 rounded-[18px] bg-[#f7f4ff] p-1.5">
        {[1, 2, 3, 4, 5].map((count) => {
          const selected = petCount === count;
          return (
            <button
              key={count}
              type="button"
              onClick={() => onPetCountChange(count)}
              className={`flex h-11 items-center justify-center rounded-[14px] text-[15px] font-bold transition ${
                selected
                  ? "bg-white text-[#5b49c8] shadow-[0_8px_18px_rgba(74,58,150,0.16)] ring-1 ring-[#d8cffc]"
                  : "text-[#6f6882]"
              }`}
              aria-label={`${count} pet${count > 1 ? "s" : ""}`}
            >
              {count}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type PackageVisualStyles = {
  iconBg: string;
  iconColor: string;
  selectedBorder: string;
  selectedBg: string;
  badgeBg: string;
  badgeText: string;
  glow: string;
};

const packageVisuals: Record<string, PackageVisualStyles> = {
  "Complete Pampering": {
    iconBg: "bg-[#fff0e3]",
    iconColor: "text-[#d85e22]",
    selectedBorder: "border-[#f6c79e]",
    selectedBg: "bg-[linear-gradient(180deg,#fffaf5_0%,#ffffff_60%,#fdf6ff_100%)]",
    badgeBg: "bg-[#fff1e8]",
    badgeText: "text-[#b84f19]",
    glow: "shadow-[0_24px_60px_rgba(234,128,40,0.14)]",
  },
  "Signature Care": {
    iconBg: "bg-[#eaf7f1]",
    iconColor: "text-[#14724f]",
    selectedBorder: "border-[#bbe5d2]",
    selectedBg: "bg-[linear-gradient(180deg,#fbfffd_0%,#ffffff_60%,#f5f7ff_100%)]",
    badgeBg: "bg-[#eaf7f1]",
    badgeText: "text-[#14724f]",
    glow: "shadow-[0_24px_60px_rgba(20,114,79,0.12)]",
  },
  "Essential Care": {
    iconBg: "bg-[#eaf4ff]",
    iconColor: "text-[#215d9a]",
    selectedBorder: "border-[#bcd9f3]",
    selectedBg: "bg-[linear-gradient(180deg,#fbfdff_0%,#ffffff_60%,#f7f4ff_100%)]",
    badgeBg: "bg-[#eef6ff]",
    badgeText: "text-[#215d9a]",
    glow: "shadow-[0_24px_60px_rgba(33,93,154,0.10)]",
  },
};

type PackageDetail = {
  bestFor: string;
  overview: string;
  inclusions: string[];
  notes: string[];
  pillBg: string;
  pillText: string;
  divider: string;
  checkColor: string;
  priceCls: string;
  ctaCls: string;
};

const PACKAGE_DETAIL: Record<string, PackageDetail> = {
  "Complete Pampering": {
    bestFor: "Best for styling and long-hair upkeep.",
    overview:
      "Complete Pampering is our flagship grooming experience — designed for pets who need personalized styling, premium coat treatments, detailed finishing, and a complete luxury grooming session.",
    inclusions: [
      "Relaxing oil massage",
      "Premium vegan shampoo",
      "Premium vegan conditioner",
      "Blow-drying",
      "Full body hairstyling / makeover grooming",
      "Paw butter massage",
      "Nail trimming",
      "Nail filing",
      "Ear cleaning",
      "Dental hygiene care",
      "Hair serum application",
      "Perfume application",
    ],
    notes: [
      "Before styling, we review recent pet photos shared by the pet parent and create visual mock-up options where applicable. Hairstyles are chosen based on current coat growth, body structure, face shape, and the finish that best suits your pet.",
      "Paw butter massage helps soothe dryness and support cracked paw pad recovery while improving comfort.",
      "Dental hygiene includes gentle tooth brushing along with oral spray application for fresher breath and cleaner oral care support.",
      "Hair serum helps reduce knotting, add shine, and support healthier coat maintenance after grooming.",
      "We use premium-quality grooming products that are 100% vegan, sulfate-free, and paraben-free.",
    ],
    pillBg: "bg-[#fff4ec]",
    pillText: "text-[#ea580c]",
    divider: "bg-[#f8e1d0]",
    checkColor: "text-[#ea580c]",
    priceCls: "bg-gradient-to-r from-[#ff8a5b] to-[#ffb15c] bg-clip-text text-transparent",
    ctaCls: "bg-gradient-to-r from-[#ff8a5b] to-[#ffb15c] text-white shadow-[0_8px_18px_rgba(255,145,92,0.18)]",
  },
  "Signature Care": {
    bestFor: "Best for hygiene and polished upkeep.",
    overview:
      "Signature Care is our hygiene-focused grooming session for pets who need a fresher, tidier, and more polished maintenance routine.",
    inclusions: [
      "Premium vegan shampoo",
      "Premium vegan conditioner",
      "Blow-drying",
      "Brushing out the coat",
      "Hygiene haircut",
      "Ear cleaning",
      "Nail trimming",
      "Nail filing",
      "Dental hygiene care",
    ],
    notes: [
      "The hygiene haircut includes trimming around the face, the genital area, and under the paws to improve cleanliness, comfort, and day-to-day upkeep.",
      "Dental hygiene includes gentle tooth brushing along with oral spray application for fresher breath and cleaner oral care support.",
      "We use premium-quality grooming products that are 100% vegan, sulfate-free, and paraben-free.",
    ],
    pillBg: "bg-[#f4efff]",
    pillText: "text-[#6d5bd0]",
    divider: "bg-[#eee9ff]",
    checkColor: "text-[#6d5bd0]",
    priceCls: "text-[#241b4b]",
    ctaCls: "bg-[#6d5bd0] text-white shadow-[0_8px_18px_rgba(109,91,208,0.16)]",
  },
  "Essential Care": {
    bestFor: "Best for routine upkeep.",
    overview:
      "Essential Care is our foundational bathing and upkeep session, designed to keep your pet clean, comfortable, and well-maintained between larger grooming visits.",
    inclusions: [
      "Premium vegan shampoo",
      "Premium vegan conditioner",
      "Blow-drying",
      "Brushing out the coat",
      "Nail trimming",
      "Nail filing",
      "Ear cleaning",
    ],
    notes: [
      "We use premium-quality grooming products that are 100% vegan, sulfate-free, and paraben-free.",
      "Best for routine upkeep, everyday freshness, and maintaining a clean, manageable coat.",
    ],
    pillBg: "bg-[#eafbf5]",
    pillText: "text-[#119b73]",
    divider: "bg-[#edf1f4]",
    checkColor: "text-[#119b73]",
    priceCls: "text-[#241b4b]",
    ctaCls: "bg-[#eefcf8] text-[#119b73] shadow-[0_8px_18px_rgba(17,155,115,0.10)] ring-1 ring-[#cde8dd]",
  },
};

const PACKAGE_COPY: Record<string, { tagline: string; whatsIncluded: string; badge: string | null }> = {
  "Complete Pampering": {
    tagline: "Full body styling with the complete spa finish.",
    whatsIncluded: "Bath · Full haircut · Nails · Ears · Paw butter · Dental",
    badge: "Most loved",
  },
  "Signature Care": {
    tagline: "Hygiene haircut, bath, and polished upkeep.",
    whatsIncluded: "Bath · Hygiene haircut · Nails · Ears · Dental",
    badge: "Most booked",
  },
  "Essential Care": {
    tagline: "Bath-led freshness, no haircut included.",
    whatsIncluded: "Bath · Blow dry · Brushing · Nails · Ears",
    badge: null,
  },
};

function PackageStep({
  serviceName,
  onServiceChange,
  onViewInclusions,
}: {
  serviceName: string;
  onServiceChange: (serviceName: string) => void;
  onViewInclusions: (serviceName: string) => void;
}) {
  return (
    <div className="space-y-3">
      {INDIVIDUAL_SESSION_SERVICES.map((service) => {
        const selected = service.name === serviceName;
        const visual = getPackageVisual(service.name);
        const PackageIcon = visual.icon;
        const styles = packageVisuals[service.name] ?? packageVisuals["Complete Pampering"];
        const copy = PACKAGE_COPY[service.name];
        return (
          <div
            key={service.name}
            role="button"
            tabIndex={0}
            aria-label={`Select ${service.name}`}
            aria-pressed={selected}
            onClick={() => onServiceChange(service.name)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onServiceChange(service.name);
              }
            }}
            className={`group relative w-full cursor-pointer overflow-hidden rounded-[30px] border px-5 pb-4 pt-5 text-left transition-all duration-300 ${
              selected
                ? `${styles.selectedBorder} ${styles.selectedBg} ${styles.glow}`
                : "border-[#ece4f8] bg-white shadow-[0_14px_36px_rgba(38,28,70,0.06)]"
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] ${styles.iconBg} shadow-[inset_0_1px_0_rgba(255,255,255,0.96),0_10px_22px_rgba(34,22,74,0.06)]`}
              >
                <PackageIcon className={`h-6 w-6 ${styles.iconColor}`} />
                {selected ? (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#6d5bd0] text-white shadow-[0_4px_10px_rgba(109,91,208,0.32)] ring-2 ring-white">
                    <Check className="h-3 w-3" strokeWidth={3.5} />
                  </span>
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[18px] font-black leading-[1.2] tracking-[-0.02em] text-[#241b4b]">
                  {service.name}
                </div>
                {copy?.badge ? (
                  <span className={`mt-2 inline-block rounded-full ${styles.badgeBg} ${styles.badgeText} px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em]`}>
                    {copy.badge}
                  </span>
                ) : null}
                <p className="mt-2 text-[14px] font-medium leading-[1.5] text-[#6b7280]">
                  {copy?.tagline}
                </p>
                <p className="mt-2.5 text-[13px] font-medium leading-[1.55] text-[#8a82a3]">
                  {copy?.whatsIncluded}
                </p>
              </div>
              <div className="ml-1 flex shrink-0 flex-col items-end gap-1.5">
                <div className="text-[20px] font-black leading-none tracking-[-0.025em] text-[#241b4b]">
                  {formatCurrency(service.price)}
                </div>
                <div className="text-[11px] font-medium text-[#9088b8]">{service.duration}</div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-[#f0ecfa] pt-3">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onViewInclusions(service.name);
                }}
                className="inline-flex items-center gap-1.5 rounded-full text-[13px] font-semibold text-[#6d5bd0] transition hover:text-[#5b49c8]"
              >
                View inclusions
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.6} />
              </button>
              <span className="text-[11px] font-medium text-[#9088b8]">
                {selected ? "Selected" : "Tap card to choose"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ScheduleStep({
  city,
  selectedDate,
  onCityChange,
  onDateChange,
}: {
  city: string;
  selectedDate: string;
  onCityChange: (city: string) => void;
  onDateChange: (date: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4">
        <div>
          <FieldLabel>Service city</FieldLabel>
          <SelectField value={city} onChange={onCityChange}>
            <option value="">Select your city</option>
            {SUPPORTED_CITIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </SelectField>
        </div>
        <div>
          <FieldLabel>Preferred visit date</FieldLabel>
          <div className="relative mt-2 flex h-[52px] items-center rounded-[18px] border border-[#ded7f1] bg-white shadow-[0_8px_20px_rgba(38,28,70,0.04)] focus-within:border-[#6d5bd0]">
            <input
              type="date"
              min={getTodayDateInputValue()}
              value={selectedDate}
              onChange={(event) => onDateChange(event.target.value)}
              className="h-full min-w-0 flex-1 appearance-none rounded-[18px] bg-transparent px-4 pr-11 text-[15px] font-semibold text-[#272238] outline-none [color-scheme:light] [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-4 [&::-webkit-calendar-picker-indicator]:h-5 [&::-webkit-calendar-picker-indicator]:w-5 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
            />
            <CalendarDays className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a80b8]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SlotStep({
  availabilityDates,
  selectedDate,
  selectedBookingWindowId,
  serviceName,
  city,
  onDateChange,
  onSlotChange,
  onRetry,
}: {
  availabilityDates: AvailabilityDate[];
  selectedDate: string;
  selectedBookingWindowId: string;
  serviceName: string;
  city: string;
  onDateChange: (date: string) => void;
  onSlotChange: (window: BookingWindow) => void;
  onRetry: () => void;
}) {
  const selectedDateBlock = availabilityDates.find((item) => item.date === selectedDate);
  const windows = selectedDateBlock?.bookingWindows || [];

  if (!availabilityDates.length) {
    return (
      <NoSlotState serviceName={serviceName} city={city} selectedDate={selectedDate} onRetry={onRetry} />
    );
  }

  return (
    <div className="space-y-5">
      <div className="-mx-4 overflow-x-auto px-4 pb-1">
        <div className="flex w-max gap-2.5 rounded-[26px] border border-[#ebe4fa] bg-white/78 p-2 shadow-[0_14px_34px_rgba(38,28,70,0.06)] backdrop-blur">
          {availabilityDates.map((item) => {
            const selected = item.date === selectedDate;
            const disabled = item.bookingWindows.length === 0;
            const [dayLabel, dateLabel = ""] = formatDateLabel(item.date).split(", ");
            return (
              <button
                key={item.date}
                type="button"
                onClick={() => onDateChange(item.date)}
                className={`relative min-w-[108px] rounded-[20px] border px-3.5 py-3 text-left transition ${
                  selected
                    ? "border-[#6d5bd0] bg-[#6d5bd0] text-white shadow-[0_12px_28px_rgba(109,91,208,0.22)]"
                    : disabled
                      ? "border-transparent bg-[#f8f7fb] text-[#9b95aa]"
                      : "border-transparent bg-white text-[#241b4b] shadow-[0_8px_18px_rgba(38,28,70,0.05)]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className={`text-[12px] font-black ${selected ? "text-white/78" : "text-[#8b82a8]"}`}>
                      {dayLabel}
                    </div>
                    <div className={`mt-1 text-[15px] font-black leading-none ${selected ? "text-white" : "text-[#241b4b]"}`}>
                      {dateLabel}
                    </div>
                  </div>
                  {selected ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#6d5bd0]">
                      <Check className="h-3 w-3" strokeWidth={3.5} />
                    </span>
                  ) : (
                    <CalendarDays className={`mt-0.5 h-4 w-4 ${disabled ? "text-[#c0b8cf]" : "text-[#9d8ce0]"}`} />
                  )}
                </div>

                <div
                  className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${
                    selected
                      ? "bg-white/18 text-white"
                      : disabled
                        ? "bg-white text-[#9b95aa]"
                        : "bg-[#f3efff] text-[#6d5bd0]"
                  }`}
                >
                  {item.bookingWindows.length ? `${item.bookingWindows.length} slots` : "No slots"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {windows.length ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-full bg-[#f3efff] px-4 py-2.5 text-[13px] font-semibold text-[#5b49c8] shadow-[inset_0_0_0_1px_rgba(109,91,208,0.06)]">
            <Clock3 className="h-4 w-4 shrink-0" />
            <span>Select your preferred start time.</span>
          </div>

          <div className="rounded-[28px] border border-[#e7defb] bg-[linear-gradient(180deg,#ffffff_0%,#fbf9ff_100%)] p-3 shadow-[0_18px_44px_rgba(38,28,70,0.08)]">
            <div className="mb-3 flex items-center justify-between px-1">
              <div className="text-[11px] font-black uppercase text-[#8b82a8]">
                Available slots
              </div>
              <div className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#6d5bd0] shadow-[0_6px_18px_rgba(38,28,70,0.07)]">
                {windows.length} open
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {windows.map((window) => {
                const selected = window.bookingWindowId === selectedBookingWindowId;
                return (
                  <button
                    key={window.bookingWindowId}
                    type="button"
                    onClick={() => onSlotChange(window)}
                    aria-pressed={selected}
                    className={`relative min-h-[84px] overflow-hidden rounded-[22px] border p-3 text-left transition ${
                      selected
                        ? "border-[#6d5bd0] bg-[#6d5bd0] text-white shadow-[0_16px_34px_rgba(109,91,208,0.25)]"
                        : "border-[#eee7fa] bg-white text-[#241b4b] shadow-[0_8px_22px_rgba(38,28,70,0.05)]"
                    }`}
                  >
                    <div
                      className={`pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full ${
                        selected ? "bg-white/10" : "bg-[#f5f0ff]"
                      }`}
                    />
                    <div className="relative z-10 flex h-full flex-col justify-between gap-3">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-[13px] ${
                            selected ? "bg-white/18 text-white" : "bg-[#f3efff] text-[#6d5bd0]"
                          }`}
                        >
                          <Clock3 className="h-4 w-4" />
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                            selected ? "bg-white text-[#5b49c8]" : "bg-[#f6f2ff] text-[#7b6bd6]"
                          }`}
                        >
                          {selected ? "Selected" : "Open"}
                        </span>
                      </div>

                      <div className="flex items-end justify-between gap-2">
                        <div className={`text-[26px] font-black leading-none ${selected ? "text-white" : "text-[#241b4b]"}`}>
                          {getSlotStartLabel(window.displayLabel)}
                        </div>
                        {selected ? (
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[#6d5bd0]">
                            <Check className="h-4 w-4" strokeWidth={3.5} />
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {window.petCount >= 5 ? (
                      <span
                        className={`absolute bottom-2.5 right-2.5 z-20 rounded-full px-2 py-1 text-[9px] font-black ${
                          selected ? "bg-white/18 text-white" : "bg-[#fff6ef] text-[#8a4b1f]"
                        }`}
                      >
                        Full day
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-[#fff6ef] px-4 py-2.5 text-[13px] font-semibold leading-[1.35] text-[#8a4b1f] shadow-[inset_0_0_0_1px_rgba(217,128,66,0.08)]">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>Arrival coordination happens before the visit.</span>
          </div>
        </div>
      ) : (
        <NoSlotState serviceName={serviceName} city={city} selectedDate={selectedDate} onRetry={onRetry} />
      )}
    </div>
  );
}

function NoSlotState({
  serviceName,
  city,
  selectedDate,
  onRetry,
}: {
  serviceName: string;
  city: string;
  selectedDate: string;
  onRetry: () => void;
}) {
  const message = `Hi All Tails, I'm trying to book ${serviceName} in ${city || "my city"} for ${
    selectedDate || "my preferred date"
  }, but no slots are available. Can you help?`;

  return (
    <div className="rounded-[28px] border border-[#ece5ff] bg-white p-6 shadow-[0_14px_36px_rgba(38,28,70,0.06)]">
      <div className="text-[18px] font-black tracking-[-0.02em] text-[#241b4b]">No slots available for this date</div>
      <p className="mt-2 text-[14px] leading-[1.65] text-[#6b7280]">
        Try another date or message us on WhatsApp for help.
      </p>
      <div className="mt-5 grid gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="h-12 rounded-[16px] border border-[#ddd4f5] bg-[#fbf9ff] text-[14px] font-semibold text-[#6d5bd0]"
        >
          View next available dates
        </button>
        <a
          href={`${SUPPORT_WHATSAPP}?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-12 items-center justify-center gap-2 rounded-[16px] bg-[#ecfdf3] text-[14px] font-semibold text-[#11804d]"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp us
        </a>
      </div>
    </div>
  );
}

function DetailsStep({
  name,
  phone,
  pets,
  savedPets,
  selectedSavedPetIds,
  savedPetsLoading,
  savedPetsError,
  serviceName,
  serviceAddress,
  serviceLandmark,
  servicePincode,
  serviceLocationUrl,
  savedServiceAddress,
  addressEditing,
  locationCaptureStatus,
  locationCapturing,
  onNameChange,
  onPhoneChange,
  onPhoneLookup,
  onSavedPetToggle,
  onPetChange,
  onAddressChange,
  onLandmarkChange,
  onPincodeChange,
  onEditAddress,
  onLocationUrlChange,
  onCaptureLocation,
  onPetPhotoUpload,
}: {
  name: string;
  phone: string;
  pets: BookingPet[];
  savedPets: SavedPetLookupItem[];
  selectedSavedPetIds: string[];
  savedPetsLoading: boolean;
  savedPetsError: string;
  serviceName: string;
  serviceAddress: string;
  serviceLandmark: string;
  servicePincode: string;
  serviceLocationUrl: string;
  savedServiceAddress: SavedServiceAddress | null;
  addressEditing: boolean;
  locationCaptureStatus: LocationCaptureStatus;
  locationCapturing: boolean;
  onNameChange: (name: string) => void;
  onPhoneChange: (phone: string) => void;
  onPhoneLookup: (phone: string) => void;
  onSavedPetToggle: (pet: SavedPetLookupItem) => void;
  onPetChange: (petId: string, patch: Partial<BookingPet>) => void;
  onAddressChange: (address: string) => void;
  onLandmarkChange: (landmark: string) => void;
  onPincodeChange: (pincode: string) => void;
  onEditAddress: () => void;
  onLocationUrlChange: (url: string) => void;
  onCaptureLocation: () => void;
  onPetPhotoUpload: (petId: string, file: File, petIndex: number) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 rounded-[30px] border border-[#ece4f8] bg-white p-5 shadow-[0_14px_36px_rgba(38,28,70,0.06)]">
        <div>
          <FieldLabel>Full name</FieldLabel>
          <input
            name="name"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Your name"
            autoComplete="name"
            className="mt-2 h-[52px] w-full rounded-[18px] border border-[#ded7f1] px-4 text-[15px] font-medium outline-none focus:border-[#6d5bd0]"
          />
        </div>
        <div>
          <FieldLabel>Phone number</FieldLabel>
          <input
            name="tel-national"
            value={phone}
            onChange={(event) => onPhoneChange(event.target.value.replace(/\D/g, "").slice(0, 10))}
            onBlur={() => onPhoneLookup(phone)}
            inputMode="tel"
            maxLength={10}
            pattern="[6-9][0-9]{9}"
            placeholder="10-digit mobile number"
            autoComplete="tel-national"
            className={`mt-2 h-[52px] w-full rounded-[18px] border px-4 text-[15px] font-medium outline-none focus:border-[#6d5bd0] ${
              phone && !isValidIndianMobile(phone) ? "border-[#fda29b] bg-[#fff8f8]" : "border-[#ded7f1]"
            }`}
          />
          <p className="mt-2 text-[13px] font-medium leading-[1.55] text-[#8a82a3]">
            We&apos;ll use this for booking updates and groomer coordination.
          </p>
        </div>
      </div>

      <div className="grid gap-4 rounded-[30px] border border-[#f0ebfb] bg-[#fbfaff]/70 p-5">
        <div>
          <div className="text-[15px] font-bold tracking-[-0.005em] text-[#3f3760]">
            {savedServiceAddress && !addressEditing ? "Saved service address" : "Service address"}
          </div>
          <p className="mt-1.5 text-[13px] font-medium leading-[1.55] text-[#8a82a3]">
            {savedServiceAddress && !addressEditing
              ? "We will use this address for your visit."
              : "Add the address first. A location pin helps the groomer navigate."}
          </p>
        </div>
        {savedServiceAddress && !addressEditing ? (
          <div className="rounded-[24px] border border-[#e5ddf8] bg-white p-4 shadow-[0_10px_28px_rgba(38,28,70,0.05)]">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5f1ff] text-[#6d5bd0]">
                <MapPin className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-black leading-[1.35] text-[#241b4b]">{serviceAddress}</div>
                <div className="mt-1 text-[13px] font-medium leading-[1.45] text-[#7b748f]">
                  {serviceLandmark ? `Near ${serviceLandmark}` : "Landmark saved"}
                  {servicePincode ? ` · ${servicePincode}` : ""}
                </div>
                {serviceLocationUrl ? (
                  <div className="mt-2 inline-flex items-center rounded-full bg-[#f0fbf5] px-2.5 py-1 text-[11px] font-bold text-[#14613f]">
                    Location pin saved
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onEditAddress}
                className="shrink-0 rounded-full bg-[#f6f2ff] px-3 py-1.5 text-[12px] font-bold text-[#6d5bd0]"
              >
                Edit
              </button>
            </div>
          </div>
        ) : (
          <>
            <input
              name="address-line1"
              value={serviceAddress}
              onChange={(event) => onAddressChange(event.target.value)}
              placeholder="House / flat, street, society"
              autoComplete="address-line1"
              className="h-[52px] rounded-[18px] border border-[#ded7f1] px-4 text-[15px] font-medium outline-none focus:border-[#6d5bd0]"
            />
            <div className="grid grid-cols-[1fr_104px] gap-2.5">
              <input
                name="address-line2"
                value={serviceLandmark}
                onChange={(event) => onLandmarkChange(event.target.value)}
                placeholder="Landmark"
                autoComplete="address-line2"
                className="h-[52px] min-w-0 rounded-[18px] border border-[#ded7f1] px-4 text-[15px] font-medium outline-none focus:border-[#6d5bd0]"
              />
              <input
                name="postal-code"
                value={servicePincode}
                onChange={(event) => onPincodeChange(event.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                maxLength={6}
                placeholder="Pincode"
                autoComplete="postal-code"
                className="h-[52px] min-w-0 rounded-[18px] border border-[#ded7f1] px-3 text-[15px] font-medium outline-none focus:border-[#6d5bd0]"
              />
            </div>
            <button
              type="button"
              onClick={onCaptureLocation}
              disabled={locationCapturing}
              className={`flex h-12 w-full items-center justify-center gap-2 rounded-[18px] border text-[14px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-75 ${
                serviceLocationUrl
                  ? "border-[#c7ead8] bg-[#f0fbf5] text-[#14613f]"
                  : "border-[#ded7f1] bg-[#fbf9ff] text-[#5b49c8]"
              }`}
            >
              {locationCapturing ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              {serviceLocationUrl ? "Location pin added" : "Use current location"}
            </button>
            {locationCaptureStatus.message ? (
              <div
                className={`rounded-[16px] border px-4 py-3 text-[13px] font-semibold leading-[1.55] ${
                  locationCaptureStatus.tone === "success"
                    ? "border-[#c7ead8] bg-[#f0fbf5] text-[#14613f]"
                    : locationCaptureStatus.tone === "error"
                      ? "border-[#ffd0d0] bg-[#fff7f7] text-[#b42318]"
                      : "border-[#e4dcf7] bg-white text-[#6d5bd0]"
                }`}
              >
                {locationCaptureStatus.message}
              </div>
            ) : null}
            {serviceLocationUrl ? (
              <input
                name="service-location-url"
                value={serviceLocationUrl}
                onChange={(event) => onLocationUrlChange(event.target.value)}
                placeholder="Google Maps link or captured location"
                className="h-[48px] rounded-[16px] border border-[#ded7f1] px-4 text-[13px] font-medium text-[#5f6678] outline-none focus:border-[#6d5bd0]"
              />
            ) : null}
            <p className="text-[12px] font-medium leading-[1.5] text-[#8a82a3]">
              You can also paste a Google Maps link if browser location permission is off.
            </p>
          </>
        )}
      </div>

      {savedPetsLoading || savedPetsError || savedPets.length ? (
        <div className="rounded-[30px] border border-[#ece4f8] bg-white p-5 shadow-[0_14px_36px_rgba(38,28,70,0.06)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[16px] font-black tracking-[-0.01em] text-[#241b4b]">Saved companions</div>
              <p className="mt-1.5 text-[13px] font-medium leading-[1.55] text-[#8a82a3]">
                Select from existing pet profiles for this number.
              </p>
            </div>
            <div className="rounded-full bg-[#f6f2ff] px-3 py-1 text-[12px] font-semibold text-[#6d5bd0]">
              {selectedSavedPetIds.length}/{pets.length}
            </div>
          </div>

          {savedPetsLoading ? (
            <div className="mt-4 flex items-center gap-2 rounded-[16px] bg-[#fbf9ff] px-4 py-3 text-[13px] font-medium text-[#6d5bd0]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking saved companions...
            </div>
          ) : null}

          {savedPetsError ? (
            <div className="mt-4 rounded-[16px] border border-[#ffd7d7] bg-[#fff8f8] px-4 py-3 text-[13px] leading-[1.55] text-[#b42318]">
              {savedPetsError}
            </div>
          ) : null}

          {savedPets.length ? (
            <div className="-mx-4 mt-4 flex gap-3 overflow-x-auto px-4 pb-1">
              {savedPets.map((savedPet) => {
                const selected = selectedSavedPetIds.includes(savedPet.petId);
                const letter = getAvatarLetter(savedPet.name, savedPet.breed);
                const gradient = getAvatarGradient(savedPet.petId || savedPet.breed || savedPet.name || "pet");
                return (
                  <button
                    key={savedPet.petId}
                    type="button"
                    onClick={() => onSavedPetToggle(savedPet)}
                    className={`w-[86px] shrink-0 text-center transition ${
                      selected ? "text-[#6d5bd0]" : "text-[#4f465f]"
                    }`}
                  >
                    <div className={`mx-auto flex h-[62px] w-[62px] items-center justify-center overflow-hidden rounded-full border bg-gradient-to-br ${gradient} text-[20px] font-black text-[#241b4b] shadow-[0_10px_22px_rgba(38,28,70,0.08)] ${
                      selected ? "border-[#6d5bd0] ring-4 ring-[#f1edff]" : "border-[#eee8fb]"
                    }`}>
                      {savedPet.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={savedPet.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span>{letter}</span>
                      )}
                    </div>
                    <div className="mt-2 truncate text-[12px] font-semibold">{savedPet.name || "Pet"}</div>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      {pets.map((pet, index) => (
        <PetEditorCard
          key={pet.id}
          pet={pet}
          index={index}
          serviceName={serviceName}
          onPetChange={onPetChange}
          onPetPhotoUpload={onPetPhotoUpload}
        />
      ))}
    </div>
  );
}

type TemperamentValue = NonNullable<BookingPet["temperament"]>;

const TEMPERAMENT_OPTIONS: Array<{
  value: TemperamentValue;
  label: string;
  bg: string;
  iconColor: string;
  ring: string;
  noteBg: string;
  noteBorder: string;
  noteText: string;
  noteEyebrow: string;
  noteTitle: string;
  note: string;
  NoteIcon: typeof Heart;
  Icon: typeof Heart;
}> = [
  {
    value: "sweet_soul",
    label: "Calm",
    bg: "bg-[#eef8f3]",
    iconColor: "text-[#11724f]",
    ring: "border-[#bfe5d4]",
    noteBg: "bg-[linear-gradient(180deg,#f0fbf5_0%,#ffffff_100%)]",
    noteBorder: "border-[#cae8d6]",
    noteText: "text-[#1f5a3f]",
    noteEyebrow: "text-[#3c8060]",
    noteTitle: "An easy session ahead",
    note: "Calmer pets usually have smoother sessions — your groomer can take time on finesse and finishing.",
    NoteIcon: Heart,
    Icon: Heart,
  },
  {
    value: "wiggle_worrier",
    label: "Anxious",
    bg: "bg-[#fff7e8]",
    iconColor: "text-[#9a5a18]",
    ring: "border-[#f1d8a8]",
    noteBg: "bg-[linear-gradient(180deg,#fff8ec_0%,#ffffff_100%)]",
    noteBorder: "border-[#f1d8a8]",
    noteText: "text-[#7a4a14]",
    noteEyebrow: "text-[#a36321]",
    noteTitle: "We'll take it slow",
    note: "Our care assistants are trained for anxious pets. We spend time befriending them before starting.",
    NoteIcon: ShieldCheck,
    Icon: Wind,
  },
  {
    value: "spicy_spark",
    label: "Can Bite",
    bg: "bg-[#fff0f0]",
    iconColor: "text-[#b84a4a]",
    ring: "border-[#f0c7c7]",
    noteBg: "bg-[linear-gradient(180deg,#fff4f4_0%,#ffffff_100%)]",
    noteBorder: "border-[#f3cfcf]",
    noteText: "text-[#7c2d2d]",
    noteEyebrow: "text-[#a44747]",
    noteTitle: "Safety first — and that's okay",
    note: "We may ask for your help with a muzzle during the session. Groomer safety comes first; we'll proceed gently and stay in touch with you throughout.",
    NoteIcon: ShieldCheck,
    Icon: Zap,
  },
];

function TemperamentSection({
  pet,
  onPetChange,
}: {
  pet: BookingPet;
  onPetChange: (petId: string, patch: Partial<BookingPet>) => void;
}) {
  const selected = TEMPERAMENT_OPTIONS.find((option) => option.value === pet.temperament);

  return (
    <div className="mt-5 rounded-[28px] border border-[#ece4f8] bg-[#fdfcff] p-5 shadow-[0_14px_36px_rgba(38,28,70,0.05)]">
      <div className="text-[15px] font-bold tracking-[-0.005em] text-[#241b4b]">Temperament</div>
      <p className="mt-1.5 text-[13px] font-medium leading-[1.55] text-[#8a82a3]">
        Helps the groomer come prepared for your pet&apos;s comfort.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {TEMPERAMENT_OPTIONS.map(({ value, label, bg, iconColor, ring, Icon }) => {
          const isSelected = pet.temperament === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onPetChange(pet.id, { temperament: value })}
              aria-pressed={isSelected}
              className={`rounded-[22px] border px-1.5 py-3.5 text-center transition ${
                isSelected
                  ? "border-[#6d5bd0] bg-[#f8f4ff] text-[#5b49c8] shadow-[0_10px_24px_rgba(109,91,208,0.13)]"
                  : "border-[#eee8fb] bg-white text-[#6f6882]"
              }`}
            >
              <span className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full border ${ring} ${bg} shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]`}>
                <Icon className={`h-[18px] w-[18px] ${iconColor}`} strokeWidth={2.4} />
              </span>
              <div className="mt-2.5 whitespace-nowrap text-[11px] font-bold leading-tight">{label}</div>
            </button>
          );
        })}
      </div>

      {selected ? (
        <div className={`mt-4 overflow-hidden rounded-[24px] border ${selected.noteBorder} ${selected.noteBg} p-4 shadow-[0_14px_32px_rgba(38,28,70,0.07)]`}>
          <div className="flex items-start gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${selected.bg} ${selected.ring} border shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]`}>
              <selected.NoteIcon className={`h-[16px] w-[16px] ${selected.iconColor}`} strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <div className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${selected.noteEyebrow}`}>
                {selected.label}
              </div>
              <div className={`mt-1 text-[14px] font-bold tracking-[-0.005em] ${selected.noteText}`}>
                {selected.noteTitle}
              </div>
              <p className={`mt-1.5 text-[13px] font-medium leading-[1.6] ${selected.noteText} opacity-90`}>
                {selected.note}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PetEditorCard({
  pet,
  index,
  serviceName,
  onPetChange,
  onPetPhotoUpload,
}: {
  pet: BookingPet;
  index: number;
  serviceName: string;
  onPetChange: (petId: string, patch: Partial<BookingPet>) => void;
  onPetPhotoUpload: (petId: string, file: File, petIndex: number) => void;
}) {
  const suggestions = getBreedSuggestions(pet.breed);
  const hasStylingDetail = Boolean(
    pet.stylingNotes.trim() ||
      pet.groomingNotes.trim() ||
      pet.stylingAssets.length > 0
  );
  const [stylingOpen, setStylingOpen] = useState<boolean>(hasStylingDetail);

  return (
    <div className="rounded-[30px] border border-[#ece4f8] bg-white p-5 shadow-[0_14px_36px_rgba(38,28,70,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <PetAvatar pet={pet} index={index} />
          <div className="min-w-0">
            <div className="text-[16px] font-black tracking-[-0.01em] text-[#241b4b]">Pet {index + 1}</div>
            {pet.breed ? (
              <div className="mt-1 truncate text-[13px] font-medium text-[#8a82a3]">{pet.breed}</div>
            ) : null}
            {pet.isSavedProfile ? (
              <div className="mt-1 text-[13px] font-medium text-[#6d5bd0]">Saved companion selected</div>
            ) : null}
          </div>
        </div>
        {pet.isSavedProfile ? (
          <span className="rounded-full bg-[#f6f2ff] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6d5bd0]">
            Profile
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4">
        <div>
          <FieldLabel>Pet name</FieldLabel>
          <input
            value={pet.name}
            onChange={(event) => onPetChange(pet.id, { name: event.target.value })}
            placeholder="Optional"
            className="mt-2 h-[52px] w-full rounded-[18px] border border-[#ded7f1] px-4 text-[15px] font-medium outline-none focus:border-[#6d5bd0]"
          />
        </div>
        <div>
          <FieldLabel>Breed</FieldLabel>
          <input
            value={pet.breed}
            onChange={(event) => onPetChange(pet.id, { breed: event.target.value })}
            onBlur={() => onPetChange(pet.id, { breed: normalizeBreedName(pet.breed) })}
            placeholder="Example: Shih Tzu"
            className="mt-2 h-[52px] w-full rounded-[18px] border border-[#ded7f1] px-4 text-[15px] font-medium outline-none focus:border-[#6d5bd0]"
          />
          {!pet.breed.trim() ? (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {POPULAR_BREEDS.map((breed) => (
                <button
                  key={breed}
                  type="button"
                  onClick={() => onPetChange(pet.id, { breed })}
                  className="rounded-full border border-[#ddd1fb] bg-[#faf8ff] px-3 py-1.5 text-[13px] font-medium text-[#5a4cb8]"
                >
                  {breed}
                </button>
              ))}
            </div>
          ) : suggestions.length ? (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {suggestions.slice(0, 4).map((breed) => (
                <button
                  key={breed}
                  type="button"
                  onClick={() => onPetChange(pet.id, { breed })}
                  className="rounded-full border border-[#ddd1fb] bg-[#faf8ff] px-3 py-1.5 text-[13px] font-medium text-[#5a4cb8]"
                >
                  {breed}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <TemperamentSection pet={pet} onPetChange={onPetChange} />

      <div className="mt-5 overflow-hidden rounded-[28px] border border-[#ece4f8] bg-[#fdfcff]">
        <button
          type="button"
          onClick={() => setStylingOpen((value) => !value)}
          aria-expanded={stylingOpen}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        >
          <div className="min-w-0">
            <div className="text-[15px] font-bold tracking-[-0.005em] text-[#241b4b]">
              Styling preferences
            </div>
            <div className="mt-1 text-[13px] font-medium leading-[1.5] text-[#8a82a3]">
              {hasStylingDetail
                ? "Tap to review or edit details"
                : "Optional — style, photo, parent notes"}
            </div>
          </div>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#6d5bd0] shadow-[inset_0_0_0_1px_#e7def8]">
            {stylingOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        </button>
        {stylingOpen ? (
          <div className="border-t border-[#ece4f8] px-5 pb-5 pt-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[12px] font-black uppercase text-[#8b82a8]">Things to highlight</div>
                <div className="mt-1 text-[12px] font-medium text-[#9a93ad]">Tap what the groomer should know.</div>
              </div>
              {pet.stylingNotes ? (
                <span className="rounded-full bg-[#f3efff] px-2.5 py-1 text-[11px] font-black text-[#6d5bd0]">
                  Selected
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {["Tangled Hair", "Matted Fur", "Sensitive Skin", "Custom Styling", "Heavy Shedding", "Deep Clean"].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => onPetChange(pet.id, { stylingNotes: chip })}
                  className={`rounded-[18px] border px-3 py-2.5 text-left text-[13px] font-bold leading-[1.2] transition ${
                    pet.stylingNotes === chip
                      ? "border-[#6d5bd0] bg-[#6d5bd0] text-white shadow-[0_10px_22px_rgba(109,91,208,0.18)]"
                      : "border-[#e6ddfa] bg-white text-[#5b49c8] shadow-[0_6px_16px_rgba(38,28,70,0.04)]"
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>

            {serviceName === "Complete Pampering" ? (
              <label className="mt-3 grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[18px] border border-dashed border-[#cfc2ef] bg-white px-4 py-3 text-[13px] font-semibold text-[#6d5bd0]">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f6f2ff]">
                  <Upload className="h-4 w-4" />
                </span>
                <span className="min-w-0 leading-[1.35]">Upload current pet picture</span>
                <span className="shrink-0 rounded-full bg-[#f6f2ff] px-2.5 py-1 text-[11px] font-bold text-[#8a80b8]">
                  {pet.stylingAssets.length ? "Uploaded" : "For mock-up"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void onPetPhotoUpload(pet.id, file, index);
                  }}
                />
              </label>
            ) : null}

            <div className="mt-4">
              <FieldLabel>Parent notes</FieldLabel>
              <textarea
                value={pet.groomingNotes}
                onChange={(event) => onPetChange(pet.id, { groomingNotes: event.target.value })}
                rows={3}
                placeholder="Share sensitive areas, matting, skin concerns, handling notes, or exact styling direction."
                className="mt-2 w-full rounded-[20px] border border-[#ded7f1] bg-white px-4 py-3 text-[14px] font-medium leading-[1.55] outline-none focus:border-[#6d5bd0]"
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ReviewStep({
  serviceName,
  city,
  selectedDate,
  selectedBookingWindow,
  pets,
  originalAmount,
  discountAmount,
  finalAmount,
  paymentMethod,
  checkoutMethod,
  addOns,
  selectedAddOnIds,
  addOnsAmount,
  couponCode,
  couponMessage,
  couponLoading,
  onEdit,
  onCouponCodeChange,
  onApplyCoupon,
  onAddOnToggle,
  onPaymentChange,
  onCheckoutMethodChange,
}: {
  serviceName: string;
  city: string;
  selectedDate: string;
  selectedBookingWindow?: BookingWindow;
  pets: BookingPet[];
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  paymentMethod: "pay_now" | "pay_after_service";
  checkoutMethod: RazorpayCheckoutMethod;
  addOns: BookingAddOn[];
  selectedAddOnIds: string[];
  addOnsAmount: number;
  couponCode: string;
  couponMessage: string;
  couponLoading: boolean;
  onEdit: (step: BookingStep) => void;
  onCouponCodeChange: (value: string) => void;
  onApplyCoupon: (code?: string) => void;
  onAddOnToggle: (addOnId: string) => void;
  onPaymentChange: (method: "pay_now" | "pay_after_service") => void;
  onCheckoutMethodChange: (method: RazorpayCheckoutMethod) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[32px] border border-[#ded4f5] bg-white shadow-[0_24px_60px_rgba(38,28,70,0.10)]">
        <div className="relative overflow-hidden bg-[linear-gradient(135deg,#241b4b_0%,#3a2c6f_100%)] px-5 py-6 text-white">
          <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-[#6d5bd0] opacity-30 blur-[60px]" aria-hidden />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">Your visit</div>
              <div className="mt-2 text-[24px] font-black tracking-[-0.03em]">{serviceName}</div>
              <p className="mt-1.5 max-w-[280px] text-[14px] font-medium leading-[1.55] text-white/80">
                {formatDateLabel(selectedDate)} · {selectedBookingWindow?.displayLabel || "Select slot"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onEdit("plan")}
              className="rounded-full border border-white/20 bg-white/12 px-3.5 py-1.5 text-[12px] font-semibold text-white"
            >
              Edit
            </button>
          </div>
        </div>

        <div className="p-5">
          <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
            {pets.map((pet, index) => (
              <div key={pet.id} className="w-[72px] shrink-0 text-center">
                <PetAvatar pet={pet} index={index} size="lg" />
                <div className="mt-2 truncate text-[12px] font-semibold text-[#241b4b]">
                  {pet.name.trim() || pet.breed || `Pet ${index + 1}`}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-1">
            <SummaryRow label="City" value={city} onEdit={() => onEdit("plan")} />
            <SummaryRow label="Visit" value={`${formatDateLabel(selectedDate)} · ${selectedBookingWindow?.displayLabel || "Select slot"}`} onEdit={() => onEdit("slot")} isLast />
          </div>
        </div>
      </div>

      {paymentMethod === "pay_now" ? (
      <div className="rounded-[30px] border border-[#ece4f8] bg-white p-5 shadow-[0_14px_36px_rgba(38,28,70,0.06)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[16px] font-black tracking-[-0.01em] text-[#241b4b]">Coupon code</div>
            <p className="mt-1.5 text-[13px] font-medium text-[#8a82a3]">
              Online payment offers — tap a code to apply.
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <input
            value={couponCode}
            onChange={(event) => onCouponCodeChange(event.target.value)}
            placeholder="Enter code"
            className="h-12 min-w-0 flex-1 rounded-[18px] border border-[#ded7f1] px-4 text-[14px] font-bold uppercase tracking-[0.08em] outline-none focus:border-[#6d5bd0]"
          />
          <button
            type="button"
            onClick={() => onApplyCoupon()}
            disabled={couponLoading || !couponCode.trim()}
            className="h-12 rounded-[18px] bg-[#241b4b] px-5 text-[13px] font-semibold text-white disabled:opacity-45"
          >
            {couponLoading ? "Checking" : "Apply"}
          </button>
        </div>
        {couponMessage ? (
          <p className={`mt-2.5 text-[13px] font-medium ${discountAmount > 0 ? "text-[#11804d]" : "text-[#b42318]"}`}>
            {couponMessage}
          </p>
        ) : null}
        <div className="mt-4 grid gap-2">
          {AVAILABLE_COUPONS.map((offer) => {
            const active = couponCode.trim().toUpperCase() === offer.code;
            return (
              <button
                key={offer.code}
                type="button"
                onClick={() => {
                  onCouponCodeChange(offer.code);
                  onApplyCoupon(offer.code);
                }}
                className={`flex items-center justify-between gap-3 rounded-[18px] border px-3.5 py-3 text-left transition ${
                  active
                    ? "border-[#6d5bd0] bg-[#f6f2ff]"
                    : "border-dashed border-[#d6cdef] bg-[#fbfaff] hover:border-[#bfb3ec]"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#6d5bd0] shadow-[inset_0_0_0_1px_#e3daf6]">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold tracking-[0.06em] text-[#241b4b]">{offer.code}</div>
                    <div className="mt-0.5 text-[12px] font-medium text-[#8a82a3]">{offer.description}</div>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${
                  active ? "bg-[#6d5bd0] text-white" : "bg-[#f1eefb] text-[#6d5bd0]"
                }`}>
                  {active ? "Applied" : "Tap to apply"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      ) : null}

      <div className="rounded-[30px] border border-[#ece4f8] bg-white p-5 shadow-[0_14px_36px_rgba(38,28,70,0.06)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[16px] font-black tracking-[-0.01em] text-[#241b4b]">Add-ons</div>
            <p className="mt-1.5 text-[13px] font-medium leading-[1.55] text-[#8a82a3]">
              Optional care items your groomer can carry for this visit.
            </p>
          </div>
          {addOnsAmount > 0 ? (
            <div className="rounded-full bg-[#f6f2ff] px-3 py-1 text-[12px] font-semibold text-[#6d5bd0]">
              +{formatCurrency(addOnsAmount)}
            </div>
          ) : null}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {addOns.map((addOn) => {
            const selected = selectedAddOnIds.includes(addOn.id);
            return (
              <button
                key={addOn.id}
                type="button"
                onClick={() => onAddOnToggle(addOn.id)}
                className={`min-h-[136px] rounded-[22px] border p-3 text-center transition ${
                  selected ? "border-[#6d5bd0] bg-[#f6f2ff]" : "border-[#eee8fb] bg-[#fcfbff]"
                }`}
              >
                <AddOnIcon icon={addOn.icon} imageSrc={addOn.imageSrc} />
                <div className="mt-2 whitespace-nowrap text-[11px] font-semibold leading-none text-[#241b4b]">{addOn.name}</div>
                <div className="mt-1 text-[14px] font-black text-[#241b4b]">{formatCurrency(addOn.price)}</div>
                <div className={`mx-auto mt-2 w-fit rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                    selected ? "bg-[#6d5bd0] text-white" : "bg-[#f1eefb] text-[#6d5bd0]"
                  }`}>
                    {selected ? "Added" : "Add"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-[30px] border border-[#ece4f8] bg-white p-5 shadow-[0_14px_36px_rgba(38,28,70,0.06)]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[16px] font-black tracking-[-0.01em] text-[#241b4b]">Price summary</div>
            <div className="mt-1.5 text-[13px] font-medium text-[#8a82a3]">{pets.length} pet{pets.length > 1 ? "s" : ""} · {serviceName}</div>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between text-[14px] font-medium text-[#625a73]">
            <span>Package price</span>
            <span className="font-semibold text-[#241b4b]">{formatCurrency(originalAmount - addOnsAmount)}</span>
          </div>
          {addOnsAmount > 0 ? (
            <div className="flex items-center justify-between text-[14px] font-medium text-[#625a73]">
              <span>Add-ons</span>
              <span className="font-semibold text-[#241b4b]">{formatCurrency(addOnsAmount)}</span>
            </div>
          ) : null}
          {discountAmount > 0 ? (
            <div className="flex items-center justify-between text-[14px] font-medium text-[#11804d]">
              <span>Discount</span>
              <span className="font-semibold">-{formatCurrency(discountAmount)}</span>
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex items-end justify-between border-t border-[#eee8fb] pt-5">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f86aa]">
              {paymentMethod === "pay_after_service" ? "Total billed" : "Total"}
            </div>
            <div className="mt-1 text-[13px] font-medium text-[#8a82a3]">
              {paymentMethod === "pay_after_service"
                ? `${formatCurrency(SLOT_BLOCK_DEPOSIT_AMOUNT)} now · balance after grooming`
                : "Inclusive of selected pets"}
            </div>
          </div>
          <div className="text-[30px] font-black tracking-[-0.04em] text-[#241b4b]">{formatCurrency(finalAmount)}</div>
        </div>
      </div>

      <div className="rounded-[30px] border border-[#d8ccff] bg-white p-5 shadow-[0_24px_60px_rgba(38,28,70,0.10)]">
        <div className="text-[16px] font-black tracking-[-0.01em] text-[#241b4b]">Payment method</div>
        <p className="mt-1.5 text-[13px] font-medium leading-[1.55] text-[#8a82a3]">
          Pick how you&apos;d like to pay. Pay after service blocks your slot with a small deposit.
        </p>

        <div className="mt-4 grid gap-2">
          {RAZORPAY_METHODS.map((method) => {
            const MethodIcon = method.icon;
            const selected = paymentMethod === "pay_now" && checkoutMethod === method.id;
            return (
              <button
                key={method.id}
                type="button"
                onClick={() => {
                  if (paymentMethod !== "pay_now") onPaymentChange("pay_now");
                  onCheckoutMethodChange(method.id);
                }}
                aria-pressed={selected}
                className={`flex items-center gap-3 rounded-[20px] border p-3.5 text-left transition ${
                  selected
                    ? "border-[#6d5bd0] bg-[#f6f2ff] shadow-[0_14px_36px_rgba(109,91,208,0.10)]"
                    : "border-[#eee8fb] bg-[#fcfbff]"
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5f1ff] text-[#6d5bd0]">
                  <MethodIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-bold text-[#241b4b]">{method.label}</div>
                  <div className="mt-0.5 text-[12px] font-medium leading-[1.5] text-[#8a82a3]">{method.helper}</div>
                </div>
                <span className={`h-4 w-4 shrink-0 rounded-full border ${
                  selected ? "border-[#6d5bd0] bg-[#6d5bd0] shadow-[inset_0_0_0_3px_white]" : "border-[#cfc7df]"
                }`} />
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => onPaymentChange("pay_after_service")}
            aria-pressed={paymentMethod === "pay_after_service"}
            className={`flex items-start gap-3 rounded-[20px] border p-4 text-left transition ${
              paymentMethod === "pay_after_service"
                ? "border-[#6d5bd0] bg-[#f6f2ff] shadow-[0_14px_36px_rgba(109,91,208,0.10)]"
                : "border-[#eee8fb] bg-[#fcfbff]"
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5f1ff] text-[#6d5bd0]">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[14px] font-bold text-[#241b4b]">Pay after service</span>
                <span className="rounded-full bg-[#f1eefb] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6d5bd0]">
                  ₹{SLOT_BLOCK_DEPOSIT_AMOUNT} deposit
                </span>
              </div>
              <p className="mt-1 text-[12px] font-medium leading-[1.55] text-[#8a82a3]">
                Pay {formatCurrency(SLOT_BLOCK_DEPOSIT_AMOUNT)} now to lock your slot. Balance is paid to the groomer after the visit. No offer codes apply.
              </p>
            </div>
            <span className={`mt-1 h-4 w-4 shrink-0 rounded-full border ${
              paymentMethod === "pay_after_service" ? "border-[#6d5bd0] bg-[#6d5bd0] shadow-[inset_0_0_0_3px_white]" : "border-[#cfc7df]"
            }`} />
          </button>
        </div>

        {paymentMethod === "pay_after_service" ? (
          <div className="mt-4 rounded-[20px] border border-[#e7def8] bg-[#fbfaff] p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13px] font-semibold text-[#241b4b]">Pay now (deposit)</span>
              <span className="text-[15px] font-black text-[#241b4b]">{formatCurrency(SLOT_BLOCK_DEPOSIT_AMOUNT)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-[13px] font-medium text-[#8a82a3]">Balance after grooming</span>
              <span className="text-[14px] font-semibold text-[#241b4b]">
                {formatCurrency(Math.max(0, originalAmount - SLOT_BLOCK_DEPOSIT_AMOUNT))}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  onEdit,
  isLast,
}: {
  label: string;
  value: string;
  onEdit?: () => void;
  isLast?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 px-1 py-3.5 ${isLast ? "" : "border-b border-[#f0ecfa]"}`}>
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-[#8a82a3]">{label}</div>
        <div className="mt-1 text-[15px] font-semibold leading-[1.35] text-[#241b4b]">{value}</div>
      </div>
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className="shrink-0 rounded-full bg-[#f5f1ff] px-3.5 py-1.5 text-[13px] font-semibold text-[#6d5bd0]"
          aria-label={`Edit ${label}`}
        >
          Edit
        </button>
      ) : null}
    </div>
  );
}

function PetAvatar({ pet, index, size = "md" }: { pet: BookingPet; index: number; size?: "md" | "lg" }) {
  const letter = getAvatarLetter(pet.name, pet.breed, `P${index + 1}`);
  const gradient = getAvatarGradient(pet.id || pet.breed || pet.name || `pet-${index}`);
  const sizeClass = size === "lg" ? "h-[58px] w-[58px] text-[20px]" : "h-12 w-12 text-[16px]";
  const photo = pet.imageUrl || pet.stylingAssets[0]?.publicUrl;

  return (
    <div className={`mx-auto flex ${sizeClass} items-center justify-center overflow-hidden rounded-full border border-[#eee8fb] bg-gradient-to-br ${gradient} font-black text-[#241b4b] shadow-[0_10px_24px_rgba(38,28,70,0.08)]`}>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" className="h-full w-full object-cover" />
      ) : (
        <span>{letter}</span>
      )}
    </div>
  );
}

function AddOnIcon({ icon, imageSrc }: { icon: string; imageSrc: string }) {
  return (
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#f3dfd5] bg-white p-2 shadow-[0_10px_22px_rgba(38,28,70,0.08)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageSrc} alt={icon.replace(/_/g, " ")} className="h-full w-full object-contain" />
    </div>
  );
}

function ConfirmationStep({
  booking,
  serviceName,
  city,
  selectedWindow,
  petCount,
  customerName,
  pets,
}: {
  booking: BookingCreateResponse;
  serviceName: string;
  city: string;
  selectedWindow: string;
  petCount: number;
  customerName: string;
  pets: BookingPet[];
}) {
  const firstName = customerName.trim().split(/\s+/)[0] || "there";
  const namedPets = pets.map((pet) => pet.name.trim()).filter(Boolean);
  const petPhrase = (() => {
    if (namedPets.length === 0) return petCount > 1 ? "your furry guests" : "your furry guest";
    if (namedPets.length === 1) return namedPets[0];
    if (namedPets.length === 2) return `${namedPets[0]} and ${namedPets[1]}`;
    return `${namedPets.slice(0, -1).join(", ")} and ${namedPets[namedPets.length - 1]}`;
  })();
  const supportMessage = encodeURIComponent(
    `Hi All Tails, this is ${customerName.trim() || "a pet parent"}. I'd like to share styling notes for booking ${booking.bookingId}.`
  );

  const timeline: Array<{ label: string; helper: string }> = [
    { label: "Groomer assigned", helper: "We match a stylist to your pet within 30 minutes." },
    { label: "Confirmation on WhatsApp", helper: "A short note one day before with arrival details." },
    { label: "Arrival window confirmed", helper: "On the morning of the visit, we share a tighter window." },
  ];

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-[32px] border border-[#e2d6f7] bg-[linear-gradient(180deg,#fbf7ff_0%,#ffffff_55%,#fff7ef_100%)] px-6 py-7 text-center shadow-[0_24px_60px_rgba(38,28,70,0.10)]">
        <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-[#e9defa] opacity-70 blur-[80px]" aria-hidden />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-44 w-44 rounded-full bg-[#fff0e3] opacity-60 blur-[80px]" aria-hidden />
        <div className="pointer-events-none absolute right-3 top-3 hidden sm:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/doodles.PNG" alt="" className="h-12 w-12 opacity-35 sm:h-14 sm:w-14" />
        </div>
        <div className="relative">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#18a34a] text-white shadow-[0_14px_30px_rgba(24,163,74,0.32)]">
            <Check className="h-6 w-6" strokeWidth={3} />
          </div>
          <div className="mt-5 text-[26px] font-black leading-[1.15] tracking-[-0.03em] text-[#241b4b]">
            You&apos;re all set, {firstName}.
          </div>
          <p className="mx-auto mt-2.5 max-w-[320px] text-[14px] font-medium leading-[1.6] text-[#6b7280]">
            We can&apos;t wait to meet {petPhrase} on {formatDateLabel(booking.selectedDate)}.
          </p>
          {booking.paymentMethod === "pay_after_service" ? (
            <p className="mx-auto mt-2 max-w-[320px] text-[13px] font-medium leading-[1.55] text-[#8a82a3]">
              Slot blocked with a {formatCurrency(SLOT_BLOCK_DEPOSIT_AMOUNT)} deposit. Balance of {formatCurrency(Math.max(0, booking.finalAmount - SLOT_BLOCK_DEPOSIT_AMOUNT))} is paid to the groomer after the visit.
            </p>
          ) : null}
          <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full border border-[#e0d6f7] bg-white/80 px-3.5 py-1.5 text-[12px] font-medium text-[#6b7280] backdrop-blur">
            <span className="text-[#9088b8]">Booking</span>
            <span className="font-mono font-semibold text-[#241b4b]">{booking.bookingId}</span>
          </div>
        </div>
      </div>

      <div className="rounded-[30px] border border-[#ece4f8] bg-white p-5 shadow-[0_14px_36px_rgba(38,28,70,0.06)]">
        <div className="text-[16px] font-black tracking-[-0.01em] text-[#241b4b]">What happens next</div>
        <p className="mt-1.5 text-[13px] font-medium leading-[1.55] text-[#8a82a3]">
          A short journey before your pet&apos;s spa day.
        </p>
        <ol className="mt-5 space-y-1">
          {timeline.map((item, index) => (
            <li
              key={item.label}
              className={`flex items-start gap-4 py-3.5 ${
                index < timeline.length - 1 ? "border-b border-[#f0ecfa]" : ""
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f5f1ff] text-[13px] font-black text-[#6d5bd0]">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold text-[#241b4b]">{item.label}</div>
                <p className="mt-1 text-[13px] font-medium leading-[1.55] text-[#8a82a3]">{item.helper}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-[30px] border border-[#ece4f8] bg-white p-5 shadow-[0_14px_36px_rgba(38,28,70,0.06)]">
        <div className="text-[16px] font-black tracking-[-0.01em] text-[#241b4b]">Booking summary</div>
        <div className="mt-3">
          <SummaryRow label="Booking ID" value={booking.bookingId} />
          <SummaryRow label="Package" value={serviceName} />
          <SummaryRow label="City" value={city} />
          <SummaryRow label="Date" value={formatDateLabel(booking.selectedDate)} />
          <SummaryRow label="Slot" value={selectedWindow} />
          <SummaryRow label="Pets" value={`${petCount} pet${petCount > 1 ? "s" : ""}`} />
          {booking.paymentMethod === "pay_after_service" ? (
            <>
              <SummaryRow label="Total billed" value={formatCurrency(booking.finalAmount)} />
              <SummaryRow label="Deposit paid" value={formatCurrency(SLOT_BLOCK_DEPOSIT_AMOUNT)} />
              <SummaryRow
                label="Balance after grooming"
                value={formatCurrency(Math.max(0, booking.finalAmount - SLOT_BLOCK_DEPOSIT_AMOUNT))}
                isLast
              />
            </>
          ) : (
            <SummaryRow
              label="Payment"
              value={booking.paymentStatus}
              isLast
            />
          )}
        </div>
      </div>

      <div className="rounded-[30px] border border-[#ece4f8] bg-[linear-gradient(180deg,#fbfaff_0%,#ffffff_100%)] p-5 shadow-[0_14px_36px_rgba(38,28,70,0.06)]">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5f1ff] text-[#6d5bd0]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[16px] font-black tracking-[-0.01em] text-[#241b4b]">
              Help us prepare for {petPhrase}
            </div>
            <p className="mt-1.5 text-[13px] font-medium leading-[1.6] text-[#6b7280]">
              Share haircut preferences or recent photos on WhatsApp — the team uses these before the visit.
            </p>
          </div>
        </div>
        <a
          href={`${SUPPORT_WHATSAPP}?text=${supportMessage}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex h-12 items-center justify-center gap-2 rounded-[16px] bg-[#ecfdf3] text-[14px] font-semibold text-[#11804d]"
        >
          <MessageCircle className="h-4 w-4" />
          Message All Tails on WhatsApp
        </a>
      </div>
    </div>
  );
}

function ExitBookingSheet({ onContinue, onLeave }: { onContinue: () => void; onLeave: () => void }) {
  return (
    <BottomSheet title="Leave booking?" onClose={onContinue}>
      <p className="text-[14px] font-medium leading-[1.65] text-[#6b7280]">Your selected details may not be saved.</p>
      <div className="mt-5 grid gap-2">
        <button
          type="button"
          onClick={onContinue}
          className="h-12 rounded-[18px] bg-[#6d5bd0] text-[14px] font-semibold text-white"
        >
          Continue booking
        </button>
        <button
          type="button"
          onClick={onLeave}
          className="h-12 rounded-[18px] border border-[#ffd7d7] bg-[#fff8f8] text-[14px] font-semibold text-[#b42318]"
        >
          Leave
        </button>
      </div>
    </BottomSheet>
  );
}

function PackageInclusionsSheet({
  serviceName,
  onClose,
  onChoose,
}: {
  serviceName: string;
  onClose: () => void;
  onChoose: () => void;
}) {
  const detail = PACKAGE_DETAIL[serviceName];
  const service = INDIVIDUAL_SESSION_SERVICES.find((option) => option.name === serviceName);
  const copy = PACKAGE_COPY[serviceName];
  if (!detail || !service) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-[rgba(17,12,33,0.55)] backdrop-blur-[3px] lg:items-center"
      onClick={onClose}
    >
      <div
        className="relative w-full max-h-[88vh] overflow-y-auto rounded-t-[32px] bg-white px-5 pb-8 pt-5 shadow-[0_-20px_80px_rgba(0,0,0,0.18)] lg:max-w-[560px] lg:rounded-[32px] lg:px-8 lg:pb-10 lg:pt-8"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${serviceName} inclusions`}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#e2dff0] lg:hidden" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close inclusions"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-[#e8e4f5] bg-[#faf8ff] text-[#6b5fc4] transition hover:bg-[#f0ebff] lg:right-6 lg:top-6"
        >
          <X className="h-4 w-4" />
        </button>

        <div className={`inline-flex rounded-full px-3 py-1.5 text-[12px] font-semibold ${detail.pillBg} ${detail.pillText}`}>
          {service.name}
        </div>
        <div className={`mt-3 text-[36px] font-black leading-none tracking-[-0.03em] ${detail.priceCls}`}>
          {formatCurrency(service.price)}
        </div>

        <p className="mt-3 text-[14px] font-medium leading-[1.75] text-[#6b7280]">{detail.overview}</p>

        <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9da3b0]">{detail.bestFor}</p>

        <div className={`mt-5 h-px w-full ${detail.divider}`} />

        <div className="mt-4">
          <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#9da3b0]">What&apos;s included</div>
          <ul className="mt-3 space-y-2.5">
            {detail.inclusions.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[14px] font-medium text-[#241b4b]">
                <span className={`mt-0.5 text-[13px] ${detail.checkColor}`}>✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={`mt-5 h-px w-full ${detail.divider}`} />

        <div className="mt-4 space-y-3">
          {detail.notes.map((note) => (
            <p key={note} className="text-[13px] font-medium leading-[1.7] text-[#8b90a0]">
              {note}
            </p>
          ))}
        </div>

        <button
          type="button"
          onClick={onChoose}
          className={`mt-6 flex h-[52px] w-full items-center justify-center gap-2 rounded-[18px] text-[15px] font-semibold leading-none transition ${detail.ctaCls}`}
        >
          {copy?.badge ? `Choose ${service.name}` : `Choose ${service.name}`}
          <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}

function BottomSheet({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/35 px-3 pb-3 backdrop-blur-[2px] md:items-center md:justify-center">
      <div className="w-full rounded-[32px] bg-white p-6 shadow-[0_24px_60px_rgba(38,28,70,0.16)] md:max-w-[420px]">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-[18px] font-black tracking-[-0.02em] text-[#241b4b]">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5f1ff] text-[#6d5bd0]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PaymentRecovery({
  message,
  onRetry,
  onClose,
}: {
  message: string;
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <div className="mb-4 rounded-[28px] border border-[#fde68a] bg-[#fffbeb] p-5 shadow-[0_14px_36px_rgba(146,64,14,0.08)]">
      <div className="text-[16px] font-black tracking-[-0.01em] text-[#92400e]">Payment was not completed</div>
      <p className="mt-2 text-[13px] font-medium leading-[1.6] text-[#92400e]">{message}</p>
      <div className="mt-4 grid gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="h-12 rounded-[16px] bg-[#6d5bd0] text-[14px] font-semibold text-white"
        >
          Retry payment
        </button>
        <a
          href={`${SUPPORT_WHATSAPP}?text=${encodeURIComponent("Hi All Tails, I need help completing payment for my booking.")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-12 items-center justify-center gap-2 rounded-[16px] border border-[#c3f0d5] bg-[#f2fcf5] text-[14px] font-semibold text-[#11804d]"
        >
          <MessageCircle className="h-4 w-4" />
          Contact support
        </a>
        <button type="button" onClick={onClose} className="h-10 text-[13px] font-semibold text-[#6d5bd0]">
          Continue reviewing booking
        </button>
      </div>
    </div>
  );
}

export default NewMobileBookingFlow;
