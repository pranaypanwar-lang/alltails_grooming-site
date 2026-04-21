"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { User, Star, Home, CalendarCheck, Layers, Package, ChevronLeft, X, CalendarDays } from "lucide-react";

/* =========================================================
   01. TYPES
========================================================= */

type UploadedAssetRef = {
  id: string;
  storageKey: string;
  publicUrl: string;
  kind: "styling_reference" | "concern_photo";
  originalName: string;
};

type UploadedCompanionAvatarRef = {
  id: string;
  storageKey: string;
  publicUrl: string;
  originalName: string;
};

type UploadedCompanionStylingRef = {
  id: string;
  storageKey: string;
  publicUrl: string;
  originalName: string;
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
  paymentOrder?: {
    orderId: string;
    amount: number;
    currency: string;
  } | null;
  loyalty?: {
    eligible: boolean;
    completedCountBefore: number;
    completedCountAfter: number | null;
    sessionsInCurrentCycleBefore: number | null;
    sessionsInCurrentCycleAfter: number | null;
    remainingToFreeBeforeBooking: number;
    remainingToFreeAfterBooking: number | null;
    rewardApplied: boolean;
    rewardLabel: string | null;
    freeUnlockedBeforeBooking: boolean;
    freeUnlockedAfterBooking: boolean | null;
  };
};

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
  theme?: {
    color: string;
  };
};

type RazorpayConstructor = new (options: RazorpayOptions) => RazorpayInstance;

// ─── My Bookings types ────────────────────────────────────────────────────────

type BookingLifecycleStatus =
  | "pending_payment"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "payment_expired";

type BookingPaymentStatus =
  | "unpaid"
  | "paid"
  | "pending_cash_collection"
  | "covered_by_loyalty"
  | "expired";

type TrackedBookingPet = {
  id: string;
  name: string | null;
  breed: string;
  groomingNotes: string | null;
  stylingNotes: string | null;
  concernImageUrls: string[];
  stylingImageUrls: string[];
};

type TrackedBookingWindow = {
  bookingWindowId: string | null;
  startTime: string;
  endTime: string;
  displayLabel: string;
  teamName: string | null;
};

type TrackedBookingLoyalty = {
  eligible: boolean;
  rewardApplied: boolean;
  rewardLabel: string | null;
  sessionsInCurrentCycle: number | null;
  remainingToFree: number | null;
};

type LoyaltyViewState =
  | "ineligible"
  | "progressing"
  | "unlocked"
  | "redeemed";

type LoyaltyStatusResponse = {
  found: boolean;
  cycleSize: 5;
  completedCount: number;
  sessionsInCurrentCycle: number;
  remainingToFree: number;
  freeUnlocked: boolean;
  unlockedAt: string | null;
  lastRedeemedAt: string | null;
  state: LoyaltyViewState;
  progressPercent: number;
  headline: string;
  supportingText: string;
};

type LoyaltyPresentation = {
  found: true;
  cycleSize: 5;
  completedCount: number;
  sessionsInCurrentCycle: number;
  remainingToFree: number;
  freeUnlocked: boolean;
  unlockedAt: string | null;
  lastRedeemedAt: string | null;
  state: LoyaltyViewState;
  progressPercent: number;
  headline: string;
  supportingText: string;
};

type TrackedBookingActions = {
  canCancel: boolean;
  canReschedule: boolean;
  canCompletePayment: boolean;
  canRebook: boolean;
  retryPaymentAllowed: boolean;
};

type TrackedBookingPaymentWindow = {
  holdActive: boolean;
  expired: boolean;
  expiresAt: string | null;
};

type TrackedBookingTimelineEvent = {
  type: string;
  label: string;
  at: string | null;
};

type TrackedBooking = {
  id: string;
  accessToken: string | null;

  status: BookingLifecycleStatus;
  statusLabel: string;
  statusCategory: "upcoming" | "past";
  supportingText: string;

  paymentStatus: BookingPaymentStatus;
  paymentStatusLabel: string;
  paymentMethod: "pay_now" | "pay_after_service" | null;
  paymentMethodLabel: string | null;

  originalAmount: number;
  finalAmount: number;
  currency: "INR";
  discountAmount: number;
  couponCode: string | null;

  service: { id: string; name: string };
  user: { city: string };

  selectedDate: string | null;
  createdAt: string;
  updatedAt: string | null;

  bookingWindow: TrackedBookingWindow | null;
  pets: TrackedBookingPet[];

  loyalty: TrackedBookingLoyalty;
  actions: TrackedBookingActions;
  paymentWindow: TrackedBookingPaymentWindow;
  timeline: TrackedBookingTimelineEvent[];
};

// ─── Companion profile types ──────────────────────────────────────────────────

type CompanionProfile = {
  id: string;
  name: string | null;
  breed: string;
  species: "dog" | "cat" | "unknown";
  avatarUrl: string | null;
  defaultGroomingNotes: string | null;
  defaultStylingNotes: string | null;
  defaultStylingReferenceUrls: string[];
  lastBookedAt: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

type CompanionEditorDraft = {
  name: string;
  breed: string;
  species: "dog" | "cat" | "unknown";
  avatarUrl: string | null;
  defaultGroomingNotes: string;
  defaultStylingNotes: string;
  defaultStylingReferenceUrls: string[];
};

type SavedPetLookupItem = {
  petId: string;
  name: string | null;
  breed: string;
  imageUrl: string | null;
  species: "dog" | "cat" | "unknown";
  lastBookedAt: string | null;
  defaultGroomingNotes?: string | null;
  defaultStylingNotes?: string | null;
};

type BlogPostPreview = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string | null;
  coverImageUrl: string | null;
  readTimeMinutes: number;
  publishedAt: string | null;
};

// ─── Booking card model ───────────────────────────────────────────────────────

type BookingCardVariant =
  | "confirmed"
  | "pending_payment"
  | "pay_after_service"
  | "completed"
  | "cancelled"
  | "payment_expired";

type BookingCardTone = "success" | "warning" | "neutral" | "danger";

type BookingCardActionId =
  | "complete_payment"
  | "reschedule"
  | "cancel_booking"
  | "book_again"
  | "view_details";

type BookingCardAction = {
  id: BookingCardActionId;
  label: string;
  emphasis: "primary" | "secondary" | "danger";
};

type BookingCardModel = {
  variant: BookingCardVariant;
  tone: BookingCardTone;
  statusLabel: string;
  supportingText: string;
  title: string;
  dateText: string;
  windowText: string;
  cityText: string;
  petsText: string;
  paymentText: string;
  amountText: string;
  urgencyText: string | null;
  showMutedStyle: boolean;
  showTimelinePreview: boolean;
  primaryAction: BookingCardAction | null;
  secondaryActions: BookingCardAction[];
  canExpand: boolean;
};

// ─── Formatting helpers ───────────────────────────────────────────────────────

const formatBookingDateText = (booking: TrackedBooking): string => {
  if (booking.selectedDate) {
    return new Date(`${booking.selectedDate}T00:00:00`).toLocaleDateString([], {
      day: "numeric", month: "short", year: "numeric",
    });
  }
  if (booking.bookingWindow?.startTime) {
    return new Date(booking.bookingWindow.startTime).toLocaleDateString([], {
      day: "numeric", month: "short", year: "numeric",
    });
  }
  return "Date unavailable";
};

const formatBookingWindowText = (booking: TrackedBooking): string => {
  if (booking.bookingWindow?.displayLabel) return booking.bookingWindow.displayLabel;
  if (booking.bookingWindow?.startTime && booking.bookingWindow?.endTime) {
    const start = new Date(booking.bookingWindow.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const end = new Date(booking.bookingWindow.endTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return `${start} – ${end}`;
  }
  return "Window unavailable";
};

const formatBookingPetsText = (booking: TrackedBooking): string => {
  if (!booking.pets.length) return "No pets";
  return booking.pets.map((p) => (p.name ? `${p.name} · ${p.breed}` : p.breed)).join(", ");
};

const formatBookingPaymentText = (booking: TrackedBooking): string => {
  if (booking.paymentStatus === "paid") return "Paid";
  if (booking.paymentStatus === "pending_cash_collection") return "Pay after service";
  if (booking.paymentStatus === "covered_by_loyalty") return "Covered by loyalty";
  if (booking.paymentStatus === "expired") return "Expired";
  return "Pending payment";
};

const formatBookingAmountText = (booking: TrackedBooking): string => `₹${booking.finalAmount}`;

const getLoyaltyBarWidth = (value: number) => `${Math.max(0, Math.min(100, value))}%`;

const getAnimatedConfirmationLoyaltyProgress = (params: {
  loyalty?: BookingCreateResponse["loyalty"];
}) => {
  const loyalty = params.loyalty;
  if (!loyalty) return null;
  if (!loyalty.eligible) return null;
  if (loyalty.rewardApplied) return null;
  if (
    loyalty.sessionsInCurrentCycleBefore === null ||
    loyalty.sessionsInCurrentCycleAfter === null
  ) {
    return null;
  }
  return {
    previousSessionsInCurrentCycle: loyalty.sessionsInCurrentCycleBefore,
    nextSessionsInCurrentCycle: loyalty.sessionsInCurrentCycleAfter,
    nextRemainingToFree: loyalty.remainingToFreeAfterBooking ?? 0,
    unlocksReward: !!loyalty.freeUnlockedAfterBooking,
  };
};

// ─── Card model builder ───────────────────────────────────────────────────────

const getBookingCardModel = (booking: TrackedBooking): BookingCardModel => {
  const { status, actions, paymentWindow } = booking;

  const base = {
    title: booking.service.name,
    dateText: formatBookingDateText(booking),
    windowText: formatBookingWindowText(booking),
    cityText: booking.user.city,
    petsText: formatBookingPetsText(booking),
    paymentText: formatBookingPaymentText(booking),
    amountText: formatBookingAmountText(booking),
    canExpand: true,
  };

  if (status === "pending_payment") {
    return {
      variant: "pending_payment",
      tone: "warning",
      statusLabel: booking.statusLabel,
      supportingText: booking.supportingText,
      ...base,
      urgencyText: paymentWindow.expiresAt
        ? `Pay before ${new Date(paymentWindow.expiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
        : null,
      showMutedStyle: false,
      showTimelinePreview: true,
      primaryAction: actions.canCompletePayment
        ? { id: "complete_payment", label: "Complete payment", emphasis: "primary" }
        : null,
      secondaryActions: actions.canCancel
        ? [{ id: "cancel_booking", label: "Cancel booking", emphasis: "danger" }]
        : [],
    };
  }

  if (status === "confirmed" && booking.paymentMethod === "pay_after_service") {
    return {
      variant: "pay_after_service",
      tone: "neutral",
      statusLabel: "Pay after service",
      supportingText: "Your session is scheduled. Payment will be collected after the visit.",
      ...base,
      urgencyText: null,
      showMutedStyle: false,
      showTimelinePreview: true,
      primaryAction: actions.canReschedule
        ? { id: "reschedule", label: "Reschedule", emphasis: "primary" }
        : null,
      secondaryActions: actions.canCancel
        ? [{ id: "cancel_booking", label: "Cancel booking", emphasis: "danger" }]
        : [],
    };
  }

  if (status === "confirmed") {
    return {
      variant: "confirmed",
      tone: "success",
      statusLabel: booking.statusLabel,
      supportingText: booking.supportingText,
      ...base,
      urgencyText: null,
      showMutedStyle: false,
      showTimelinePreview: true,
      primaryAction: actions.canReschedule
        ? { id: "reschedule", label: "Reschedule", emphasis: "primary" }
        : null,
      secondaryActions: actions.canCancel
        ? [{ id: "cancel_booking", label: "Cancel booking", emphasis: "danger" }]
        : [],
    };
  }

  if (status === "completed") {
    return {
      variant: "completed",
      tone: "success",
      statusLabel: booking.statusLabel,
      supportingText: booking.supportingText,
      ...base,
      urgencyText: null,
      showMutedStyle: true,
      showTimelinePreview: true,
      primaryAction: actions.canRebook
        ? { id: "book_again", label: "Book again", emphasis: "primary" }
        : null,
      secondaryActions: [],
    };
  }

  if (status === "cancelled") {
    return {
      variant: "cancelled",
      tone: "danger",
      statusLabel: booking.statusLabel,
      supportingText: booking.supportingText,
      ...base,
      urgencyText: null,
      showMutedStyle: true,
      showTimelinePreview: true,
      primaryAction: actions.canRebook
        ? { id: "book_again", label: "Book again", emphasis: "primary" }
        : null,
      secondaryActions: [],
    };
  }

  return {
    variant: "payment_expired",
    tone: "danger",
    statusLabel: booking.statusLabel,
    supportingText: booking.supportingText,
    ...base,
    urgencyText: null,
    showMutedStyle: true,
    showTimelinePreview: true,
    primaryAction: actions.canRebook
      ? { id: "book_again", label: "Book again", emphasis: "primary" }
      : null,
    secondaryActions: [],
  };
};

// ─── Tone style maps ──────────────────────────────────────────────────────────

const toneBadgeStyle: Record<BookingCardTone, string> = {
  success: "bg-[#dcfce7] text-[#15803d]",
  warning: "bg-[#fef9c3] text-[#a16207]",
  neutral: "bg-[#f0f0f5] text-[#4b4370]",
  danger: "bg-[#fee2e2] text-[#b91c1c]",
};

type PlanPackage = {
  name: string;
  price: number;
  badge: string | null;
  bestFor: string;
  summary: string;
  overview: string;
  inclusions: string[];
  notes: string[];
  ctaLabel: string;
  accent: "teal" | "violet" | "orange";
  icon: string;
  badgeBg: string;
  badgeShadow: string;
  pillBg: string;
  pillText: string;
  iconBg: string;
  divider: string;
  checkColor: string;
  priceCls: string;
  btnCls: string;
  desktopBtnCls?: string;
  cardBorder?: string;
  cardBg?: string;
  cardShadow?: string;
};

/* =========================================================
   03. SMALL HELPERS
========================================================= */

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "P";
}

const SUPPORTED_CITIES = [
  "Chandigarh",
  "Delhi",
  "Faridabad",
  "Ghaziabad",
  "Greater Noida",
  "Gurgaon",
  "Ludhiana",
  "Kharar",
  "Mohali",
  "Noida",
  "Panchkula",
  "Patiala",
] as const;

const SERVICE_OPTIONS = [
  {
    name: "Complete Pampering",
    price: 1799,
    category: "Individual Sessions",
    order: 1,
  },
  {
    name: "Signature Care",
    price: 1299,
    category: "Individual Sessions",
    order: 2,
  },
  {
    name: "Essential Care",
    price: 999,
    category: "Individual Sessions",
    order: 3,
  },
  {
    name: "Starter Plan",
    price: 3799,
    category: "Coat Care Plans",
    order: 4,
  },
  {
    name: "Care Plan",
    price: 6999,
    category: "Coat Care Plans",
    order: 5,
  },
  {
    name: "Wellness Plan",
    price: 14999,
    category: "Coat Care Plans",
    order: 6,
  },
] as const;

const PACKAGES = [
  {
    name: "Complete Pampering",
    price: 1799,
    badge: "Best for Long-Hair Breeds",
    bestFor: "Best for styling and long-hair upkeep.",
    summary: "A luxury makeover session with personalized styling, premium coat treatments, paw care, dental hygiene, and a beautifully finished coat.",
    overview: "Complete Pampering is our flagship grooming experience — designed for pets who need personalized styling, premium coat treatments, detailed finishing, and a complete luxury grooming session.",
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
    ctaLabel: "Book Complete Pampering",
    accent: "orange",
    icon: "✨",
    cardBorder: "border-[#f6d9c0]",
    cardBg: "bg-[linear-gradient(180deg,#fffdfb_0%,#fff7f1_100%)]",
    cardShadow: "shadow-[0_20px_52px_rgba(234,88,12,0.10)]",
    badgeBg: "bg-[#f97316]/90",
    badgeShadow: "shadow-[0_8px_18px_rgba(255,145,92,0.22)]",
    pillBg: "bg-[#fff4ec]",
    pillText: "text-[#ea580c]",
    iconBg: "bg-[#fff4ec]",
    divider: "bg-[#f8e1d0]",
    checkColor: "text-[#ea580c]",
    priceCls: "bg-gradient-to-r from-[#ff8a5b] to-[#ffb15c] bg-clip-text text-transparent",
    btnCls: "bg-gradient-to-r from-[#ff8a5b] to-[#ffb15c] text-white shadow-[0_8px_18px_rgba(255,145,92,0.18)]",
desktopBtnCls: "bg-gradient-to-r from-[#ff8a5b] to-[#ffb15c] text-white shadow-[0_12px_24px_rgba(255,145,92,0.20)]",
  },
  {
    name: "Signature Care",
    price: 1299,
    badge: "Most Bought",
    bestFor: "Best for hygiene and polished upkeep.",
    summary: "A balanced grooming session with bathing, hygiene trimming, dental care, and essential upkeep for a cleaner, more polished finish.",
    overview: "Signature Care is our hygiene-focused grooming session for pets who need a fresher, tidier, and more polished maintenance routine.",
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
    ctaLabel: "Book Signature Care",
    accent: "violet",
    icon: "✂️",
    cardBorder: "border-[#e8e2ff]",
    cardBg: "bg-white",
    cardShadow: "shadow-[0_18px_48px_rgba(109,91,208,0.08)]",
    badgeBg: "bg-[#6d5bd0]/90",
    badgeShadow: "shadow-[0_8px_18px_rgba(109,91,208,0.16)]",
    pillBg: "bg-[#f4efff]",
    pillText: "text-[#6d5bd0]",
    iconBg: "bg-[#f5f1ff]",
    divider: "bg-[#eee9ff]",
    checkColor: "text-[#6d5bd0]",
    priceCls: "text-[#2a2346]",
    btnCls: "bg-[#6d5bd0] text-white shadow-[0_8px_18px_rgba(109,91,208,0.16)]",
desktopBtnCls: "bg-[#f5f1ff] text-[#6d5bd0]",
  },
  {
    name: "Essential Care",
    price: 999,
    badge: null,
    bestFor: "Best for routine upkeep.",
    summary: "A premium upkeep session focused on coat cleansing, brushing, nail care, and everyday freshness.",
    overview: "Essential Care is our foundational bathing and upkeep session, designed to keep your pet clean, comfortable, and well-maintained between larger grooming visits.",
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
    ctaLabel: "Book Essential Care",
    accent: "teal",
    icon: "🫧",
    cardBorder: "border-[#e6eef0]",
    cardBg: "bg-white",
    cardShadow: "shadow-[0_14px_40px_rgba(0,0,0,0.05)]",
    badgeBg: "",
    badgeShadow: "",
    pillBg: "bg-[#eafbf5]",
    pillText: "text-[#119b73]",
    iconBg: "bg-[#ecfbf6]",
    divider: "bg-[#edf1f4]",
    checkColor: "text-[#119b73]",
    priceCls: "text-[#2a2346]",
    btnCls: "bg-[#eefcf8] text-[#119b73] shadow-[0_8px_18px_rgba(17,155,115,0.08)]",
desktopBtnCls: "bg-[#eefcf8] text-[#119b73]",
  },
];

const PLANS: PlanPackage[] = [
  {
    name: "Starter Plan",
    price: 3799,
    badge: null,
    bestFor: "Best for beginning a regular care cycle.",
    summary:
      "A starter multi-session plan designed to build consistency, improve hygiene upkeep, and support healthier coats over time.",
    overview:
      "Starter Plan is designed for pets who are beginning a regular grooming rhythm. Over the course of the plan, we help maintain your pet’s hygiene, coat cleanliness, brushing routine, and overall freshness more consistently than occasional one-time visits.",
    inclusions: [
      "3 structured grooming sessions",
      "Premium bath and cleansing care",
      "Coat brushing and basic upkeep",
      "Nail trimming and nail filing",
      "Ear cleaning",
      "Routine hygiene and freshness maintenance",
    ],
    notes: [
      "This plan is ideal for pets moving from irregular grooming to a more consistent coat-care routine.",
      "Across the duration of the plan, we help maintain cleanliness, coat manageability, and day-to-day comfort more proactively.",
      "It is best suited for first-time plan users, pets with lighter upkeep needs, or families who want to build a healthier grooming rhythm.",
      "We use premium-quality grooming products that are 100% vegan, sulfate-free, and paraben-free.",
    ],
    ctaLabel: "Choose Starter Plan",
    accent: "teal",
    icon: "🧼",
    badgeBg: "",
    badgeShadow: "",
    pillBg: "bg-[#eafbf5]",
    pillText: "text-[#119b73]",
    iconBg: "bg-[#ecfbf6]",
    divider: "bg-[#edf1f4]",
    checkColor: "text-[#119b73]",
    priceCls: "text-[#2a2346]",
    btnCls: "bg-[#eefcf8] text-[#119b73] shadow-[0_8px_18px_rgba(17,155,115,0.08)]",
  },
  {
    name: "Care Plan",
    price: 6999,
    badge: "Most Recommended",
    bestFor: "Best for complete upkeep and consistency.",
    summary:
      "A structured maintenance plan that helps consistently maintain your pet’s look, hygiene, coat condition, and grooming routine across multiple visits.",
    overview:
      "Care Plan is built for pets who need ongoing upkeep, not just occasional grooming. Over the duration of the plan, we work to consistently maintain your pet’s appearance, hygiene, coat health, and overall grooming standard so they stay clean, comfortable, and well-kept between visits.",
    inclusions: [
      "6 structured grooming sessions",
      "Ongoing coat and hygiene upkeep",
      "Regular maintenance of overall grooming appearance",
      "Support for coat manageability and cleanliness",
      "Routine monitoring across grooming cycles",
      "Better continuity than one-time sessions",
    ],
    notes: [
      "This plan is designed for pet parents who want their pet’s overall look and hygiene to stay consistently maintained over time.",
      "Instead of waiting for the coat, hygiene, or appearance to deteriorate, the plan helps preserve a clean, polished, and well-kept standard across multiple sessions.",
      "It is especially useful for pets who need steady upkeep, better coat monitoring, and a more regular maintenance rhythm.",
      "Over the plan duration, we help maintain grooming continuity so coat condition, hygiene, and visible appearance are managed more proactively.",
      "We use premium-quality grooming products that are 100% vegan, sulfate-free, and paraben-free.",
    ],
    ctaLabel: "Start Care Plan",
    accent: "violet",
    icon: "✂️",
    badgeBg: "bg-[#6d5bd0]/90",
    badgeShadow: "shadow-[0_8px_18px_rgba(109,91,208,0.14)]",
    pillBg: "bg-[#f4efff]",
    pillText: "text-[#6d5bd0]",
    iconBg: "bg-[#f5f1ff]",
    divider: "bg-[#eee9ff]",
    checkColor: "text-[#6d5bd0]",
    priceCls: "text-[#2a2346]",
    btnCls: "bg-[#6d5bd0] text-white shadow-[0_8px_18px_rgba(109,91,208,0.16)]",
  },
  {
    name: "Wellness Plan",
    price: 14999,
    badge: "Best Value",
    bestFor: "Best for long-term coat health and full-year upkeep.",
    summary:
      "Our best-value long-term plan for pets that benefit from extended grooming continuity, stronger coat maintenance, and consistent upkeep across the year.",
    overview:
      "Wellness Plan is our most complete long-term coat-care plan for pets who benefit from consistent upkeep across the year. It is designed to maintain your pet’s appearance, hygiene, coat condition, and grooming continuity over a longer period, helping prevent neglect, matting, and irregular maintenance.",
    inclusions: [
      "12 structured grooming sessions",
      "Extended care across full coat and upkeep cycles",
      "Long-term maintenance of appearance, hygiene, and coat condition",
      "Better continuity across the year",
      "Stronger prevention of irregular upkeep and coat decline",
      "Lower effective cost per session through long-term care",
    ],
    notes: [
      "This plan is best for pet parents who want dependable year-round upkeep instead of reactive, occasional grooming.",
      "Over the duration of the plan, we help maintain coat condition, cleanliness, visible appearance, and grooming consistency at a much higher standard.",
      "It is ideal for pets that need long-term support, more structured continuity, and a proactive care cycle rather than one-off cleanups.",
      "The value of the plan comes not only from pricing, but from maintaining your pet’s coat, hygiene, and overall presentation more consistently over time.",
      "We use premium-quality grooming products that are 100% vegan, sulfate-free, and paraben-free.",
    ],
    ctaLabel: "Choose Wellness Plan",
    accent: "orange",
    icon: "✨",
    badgeBg: "bg-[#f97316]/90",
    badgeShadow: "shadow-[0_8px_18px_rgba(255,145,92,0.18)]",
    pillBg: "bg-[#fff4ec]",
    pillText: "text-[#ea580c]",
    iconBg: "bg-[#fff4ec]",
    divider: "bg-[#f8e1d0]",
    checkColor: "text-[#ea580c]",
    priceCls: "bg-gradient-to-r from-[#ff8a5b] to-[#ffb15c] bg-clip-text text-transparent",
    btnCls: "bg-gradient-to-r from-[#ff8a5b] to-[#ffb15c] text-white shadow-[0_8px_18px_rgba(255,145,92,0.18)]",
  },
];

const BREED_OPTIONS = [
  "Beagle",
  "Border Collie",
  "Boxer",
  "Chihuahua",
  "Cocker Spaniel",
  "Dachshund",
  "French Bulldog",
  "German Shepherd",
  "Golden Retriever",
  "Indie",
  "Labrador Retriever",
  "Lhasa Apso",
  "Maltese",
  "Persian Cat",
  "Pomeranian",
  "Poodle",
  "Pug",
  "Rottweiler",
  "Shih Tzu",
  "Siberian Husky",
  "Spitz",
  "Yorkshire Terrier",
] as const;

const BREED_NORMALIZATION_MAP: Record<string, string> = {
  lab: "Labrador Retriever",
  labrador: "Labrador Retriever",
  labretriever: "Labrador Retriever",
  gsd: "German Shepherd",
  germanshepherd: "German Shepherd",
  golden: "Golden Retriever",
  goldenretriever: "Golden Retriever",
  shihtzu: "Shih Tzu",
  shitzu: "Shih Tzu",
  lhasa: "Lhasa Apso",
  indiee: "Indie",
  pom: "Pomeranian",
  pomeraniann: "Pomeranian",
  huskyy: "Siberian Husky",
  yorkie: "Yorkshire Terrier",
  frenchie: "French Bulldog",
  doxie: "Dachshund",
  cockerspaniel: "Cocker Spaniel",
};

/* =========================================================
   04A-NEW. EDITORIAL REVIEW SECTION DATA
========================================================= */

const featuredEditorialReview = {
  quote:
    "I had called All Tails for the grooming of my Beagle. They were absolutely professional and very gentle with him. A coconut oil massage followed by a bath, ear cleaning, nail trim, and a final spray of doggy perfume — the entire experience felt thoughtful, calm, and beautifully handled.",
  name: "Sheetal Suri",
  dateLabel: "a month ago",
  rating: 5,
  tags: ["Very gentle", "Professional team", "Beautiful finish"],
};

const themedProofCards = [
  {
    theme: "Gentle handling",
    quote: "The groomer was very polite and handled well even though my dog is hyper active.",
    name: "Neha Taneja",
    accent: "violet",
  },
  {
    theme: "Calm experience",
    quote: "They became friend with my pet before starting the service and the process went all smooth.",
    name: "amisha",
    accent: "mint",
  },
  {
    theme: "Professional finish",
    quote: "Dogs look fresh and clean. They were very tender and soft with my dogs.",
    name: "Pooja Punchhi",
    accent: "peach",
  },
] as const;

const reviewRailCards = [
  { quote: "Amazing calm and good expert staff.", name: "Sujal Arora", theme: "Calm staff" },
  { quote: "Very polite and a lot of patience.", name: "Minakshi Singh", theme: "Patient care" },
  { quote: "Super gentle and professional.", name: "Shireen Latif", theme: "Gentle handling" },
  { quote: "My pet was handled with love and patience.", name: "manpreet kaur", theme: "Handled with love" },
  { quote: "Brilliant haircut, very happy.", name: "manubhav sharma", theme: "Beautiful finish" },
  { quote: "Very caring and hassle free.", name: "Neenu Jain", theme: "Hassle free" },
  { quote: "Professional, caring, and excellent.", name: "Dr. Akanksha Vatsa", theme: "Professional team" },
  { quote: "The process went all smooth.", name: "amisha", theme: "Smooth service" },
] as const;

const proofCardStyles = {
  violet: {
    badge: "bg-[#f4efff] text-[#6d5bd0]",
    card: "border-[#ece5ff] bg-white",
    text: "text-[#2f2850]",
    subtext: "text-[#8a84a3]",
    shadow: "shadow-[0_16px_40px_rgba(73,44,120,0.07)]",
  },
  mint: {
    badge: "bg-[#eefbf7] text-[#119b73]",
    card: "border-[#dff3ec] bg-white",
    text: "text-[#24443a]",
    subtext: "text-[#7f9b92]",
    shadow: "shadow-[0_14px_34px_rgba(17,155,115,0.07)]",
  },
  peach: {
    badge: "bg-[#fff4ea] text-[#d07a2d]",
    card: "border-[#f1e6dc] bg-white",
    text: "text-[#453325]",
    subtext: "text-[#a38d7b]",
    shadow: "shadow-[0_14px_36px_rgba(208,122,45,0.08)]",
  },
} as const;

export default function GroomingLandingPage() {
  const prefersReducedMotion = useReducedMotion();

  /* =========================================================
     04B. PACKAGES / CAROUSEL LOGIC
  ========================================================= */

  const [activeSessionSlide, setActiveSessionSlide] = useState(0);
  const [activePlanSlide, setActivePlanSlide] = useState(0);
  const [activeTrustSlide, setActiveTrustSlide] = useState(0);
  const trustCarouselRef = useRef<HTMLDivElement | null>(null);

  /* ── BOTTOM NAV ACTIVE SECTION ── */
  const [activeNavSection, setActiveNavSection] = useState<string>("home-section");

  /* ── HEADER SCROLL COMPRESSION ── */
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);

  /* ── MOBILE BOOKING STEP ── */
  const [mobileBookingStep, setMobileBookingStep] = useState<"setup" | "slot" | "details" | "pets" | "payment">("setup");
  const [bookingIdCopied, setBookingIdCopied] = useState(false);
  const [, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    const sectionIds = ["home-section", "packages-section", "reviews-section"];
    const observers: IntersectionObserver[] = [];

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveNavSection(id); },
        { threshold: 0.3 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  useEffect(() => {
    const onScroll = () => setIsHeaderScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const mobileFeaturedReview = {
    ...featuredEditorialReview,
    quote:
      "They were absolutely professional and very gentle with my Beagle. The entire experience felt thoughtful, calm, and beautifully handled.",
    tags: featuredEditorialReview.tags.slice(0, 2) as [string, string],
  };

  const mobileReviewRailCards: Array<{
    quote: string;
    name: string;
    theme: string;
    accent?: string;
  }> = [
    ...themedProofCards.map((card) => ({
      quote: card.quote,
      name: card.name,
      theme: card.theme,
      accent: card.accent,
    })),
    ...reviewRailCards,
  ];

  const sessionCarouselRef = useRef<HTMLDivElement | null>(null);
  const plansCarouselRef = useRef<HTMLDivElement | null>(null);

  const getNearestCarouselIndex = (container: HTMLDivElement) => {
    const slides = Array.from(
      container.querySelectorAll<HTMLElement>("[data-carousel-slide='true']")
    );

    if (!slides.length) return 0;

    const containerLeft = container.getBoundingClientRect().left;

    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    slides.forEach((slide, index) => {
      const distance = Math.abs(
        slide.getBoundingClientRect().left - containerLeft
      );

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    return closestIndex;
  };

  const handleSessionCarouselScroll = (
    e: React.UIEvent<HTMLDivElement>
  ) => {
    setActiveSessionSlide(getNearestCarouselIndex(e.currentTarget));
  };

  const handlePlansCarouselScroll = (
    e: React.UIEvent<HTMLDivElement>
  ) => {
    setActivePlanSlide(getNearestCarouselIndex(e.currentTarget));
  };

  const handleTrustCarouselScroll = (
    e: React.UIEvent<HTMLDivElement>
  ) => {
    setActiveTrustSlide(getNearestCarouselIndex(e.currentTarget));
  };

  /* =========================================================
     04C. PAGE ACTIONS
  ========================================================= */

const WHATSAPP_NUMBER = "919560098105";
const SUPPORT_PHONE_DISPLAY = "+91 95600 98105";
const SUPPORT_PHONE_HREF = "tel:+919560098105";
const SUPPORT_EMAIL = "hello@alltails.in";
const SUPPORT_EMAIL_HREF = "mailto:hello@alltails.in";
const WHATSAPP_HREF = `https://wa.me/${WHATSAPP_NUMBER}`;

  const openBookingFlow = () => {
    setSlotsError("");
    setSlotsMessage("");
    setBookingCreateError("");
    setSelectedBookingWindowId("");
    setConfirmedBooking(null);
    setConfirmationLoyaltyProgress(null);
    setAvailabilityDates([]);
    setBookingWindows([]);
    setSelectedDate("");
    setPetCount(1);
setPets([createEmptyPet()]);
setExpandedPetNotes([]);
setSelectedSavedPetIds([]);
setSavedPets([]);
setSavedPetsError("");
setSavedPetsLookupDoneForPhone("");
setPaymentMethod("pay_now");
    setCouponCode("");
    updatePricingPreview("");
    setMobileBookingStep("setup");
setIsCalendarOpen(false);
setIsSlotsModalOpen(true);
  };

  const openWhatsAppChat = (message?: string) => {
    const text =
      message ||
      "Hi All Tails, I’d like help choosing the right grooming package for my pet.";

    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
      text
    )}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handlePackageBookNow = (packageName: string) => {
    setHeroForm((prev) => ({
      ...prev,
      service: packageName,
    }));

    setSlotsError("");
    setSlotsMessage("");
    setBookingCreateError("");
    setSelectedBookingWindowId("");
    setConfirmedBooking(null);
setIsCalendarOpen(false);
setIsSlotsModalOpen(true);
  };
  /* -------------------------------------------------------
     04A. HERO + BASIC FORM STATE
  ------------------------------------------------------- */

  const [packageView, setPackageView] = useState<"sessions" | "plans">("sessions");

  const [heroForm, setHeroForm] = useState({
  name: "",
  phone: "",
  city: "",
  service: "Complete Pampering",
  requiredDate: "",
});

  /* -------------------------------------------------------
     04B. BOOKING / SLOTS STATE
  ------------------------------------------------------- */

  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");
  const [slotsMessage, setSlotsMessage] = useState("");

  const [bookingCreateLoading, setBookingCreateLoading] = useState(false);
  const [bookingCreateError, setBookingCreateError] = useState("");

  // Payment-failed recovery modal
  const [pendingPaymentBookingId, setPendingPaymentBookingId] = useState<string | null>(null);
  const [pendingPaymentAccessToken, setPendingPaymentAccessToken] = useState<string | null>(null);
  const [pendingPaymentError, setPendingPaymentError] = useState("");
  const [pendingPaymentRetrying, setPendingPaymentRetrying] = useState(false);
  const [pendingPaymentCancelling, setPendingPaymentCancelling] = useState(false);

  const [confirmedBooking, setConfirmedBooking] = useState<{
    bookingId: string;
    accessToken: string;
    paymentStatus: string;
    status: string;
    finalAmount: number;
    originalAmount: number;
    selectedDate: string;
    paymentMethod: "pay_now" | "pay_after_service";
    serviceName: string;
    city: string;
    petCount: number;
    bookingWindowLabel: string;
    loyaltyRewardApplied?: boolean;
    serviceAddress: string;
    serviceLandmark: string;
    servicePincode: string;
    serviceLocationUrl: string;
    addressStatus: "missing" | "partial" | "complete";
  } | null>(null);
  const [confirmedAddressDraft, setConfirmedAddressDraft] = useState({
    serviceAddress: "",
    serviceLandmark: "",
    servicePincode: "",
    serviceLocationUrl: "",
  });
  const [confirmedAddressSaving, setConfirmedAddressSaving] = useState(false);
  const [confirmedAddressError, setConfirmedAddressError] = useState("");
  const [confirmedAddressSuccess, setConfirmedAddressSuccess] = useState("");

const handleRetryPayment = async (bookingId: string, accessToken: string | null) => {
  try {
    setTrackLoading(true);
    setTrackError("");
    setTrackSuccessMessage("");

    const response = await fetch("/api/payment/razorpay/retry-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, accessToken }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || "Could not start payment retry");
    }

    const razorpayLoaded = await loadRazorpayScript();
    if (!razorpayLoaded) {
      throw new Error("Could not load Razorpay checkout.");
    }

    const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!razorpayKey) {
      throw new Error("Razorpay public key is missing.");
    }

    const Razorpay = getRazorpay();
    const razorpay = new Razorpay({
      key: razorpayKey,
      amount: data.amount,
      currency: data.currency,
      order_id: data.orderId,
      name: "All Tails",
      description: "Complete pending booking payment",
      handler: async function (response: RazorpayPaymentSuccessResponse) {
        const verifyResponse = await fetch("/api/payment/razorpay/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId,
            accessToken,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          }),
        });

        const verifyData = await verifyResponse.json();

        if (!verifyResponse.ok) {
          throw new Error(verifyData?.error || "Payment verification failed");
        }

        await refreshTrackedBookings(trackPhone);
        setTrackSuccessMessage("Payment completed successfully.");
      },
      modal: {
        ondismiss: async function () {
          try {
            await fetch("/api/payment/razorpay/mark-pending", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ bookingId, accessToken, reason: "retry_checkout_dismissed" }),
            });
            await refreshTrackedBookings(trackPhone);
          } catch (e) {
            console.error(e);
          }
        },
      },
    });

    razorpay.on("payment.failed", async function (failResponse: RazorpayFailureResponse) {
      try {
        await fetch("/api/payment/razorpay/mark-pending", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId,
            accessToken,
            reason: "retry_payment_failed",
            gatewayError: failResponse?.error?.description || null,
          }),
        });
      } catch (e) {
        console.error(e);
      }
      setTrackError(failResponse?.error?.description || "Payment failed. Please try again.");
    });

    razorpay.open();
  } catch (error) {
    console.error(error);
    setTrackError(
      error instanceof Error ? error.message : "Could not retry payment."
    );
  } finally {
    setTrackLoading(false);
  }
};
  /* -------------------------------------------------------
     04C. TRACK BOOKING STATE
  ------------------------------------------------------- */

  const [isTrackBookingOpen, setIsTrackBookingOpen] = useState(false);
  const [isMockupModalOpen, setIsMockupModalOpen] = useState(false);
  const [bookingsTab, setBookingsTab] = useState<"upcoming" | "past">("upcoming");

  // ─── Companion management state ───────────────────────────────────────────
  const [isSavedCompanionsOpen, setIsSavedCompanionsOpen] = useState(false);
  const [companions, setCompanions] = useState<CompanionProfile[]>([]);
  const [companionsLoading, setCompanionsLoading] = useState(false);
  const [companionsError, setCompanionsError] = useState("");
  const [activeCompanionId, setActiveCompanionId] = useState<string | null>(null);
  const [isCompanionEditorOpen, setIsCompanionEditorOpen] = useState(false);
  const [companionEditorMode, setCompanionEditorMode] = useState<"create" | "edit">("create");
  const [companionEditorSaving, setCompanionEditorSaving] = useState(false);
const [companionEditorUploadingAvatar, setCompanionEditorUploadingAvatar] = useState(false);
const [companionEditorUploadingStylingRefs, setCompanionEditorUploadingStylingRefs] = useState(false);
const [companionEditorError, setCompanionEditorError] = useState("");
  const [companionDraft, setCompanionDraft] = useState<CompanionEditorDraft>({
    name: "", breed: "", species: "unknown", avatarUrl: null,
    defaultGroomingNotes: "", defaultStylingNotes: "", defaultStylingReferenceUrls: [],
  });
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
  const [trackPhone, setTrackPhone] = useState("");
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState("");
  const [trackedBookings, setTrackedBookings] = useState<TrackedBooking[]>([]);
  const [trackSuccessMessage, setTrackSuccessMessage] = useState("");

  /* -------------------------------------------------------
     04D. RESCHEDULE STATE
  ------------------------------------------------------- */

  const [rescheduleBookingId, setRescheduleBookingId] = useState("");
  const [rescheduleAccessToken, setRescheduleAccessToken] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleCity, setRescheduleCity] = useState("");
  const [reschedulePetCount, setReschedulePetCount] = useState(1);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleError, setRescheduleError] = useState("");
  const [rescheduleWindows, setRescheduleWindows] = useState<BookingWindow[]>([]);
  const [selectedRescheduleWindowId, setSelectedRescheduleWindowId] = useState("");
  const [rescheduleSuccessMessage, setRescheduleSuccessMessage] = useState("");

  /* -------------------------------------------------------
     04E. PAYMENT + PRICING STATE
  ------------------------------------------------------- */

  const [paymentMethod, setPaymentMethod] = useState<"pay_now" | "pay_after_service">(
    "pay_now"
  );
  const [couponCode, setCouponCode] = useState("");
  const [pricingPreview, setPricingPreview] = useState({
    originalAmount: 1799,
    finalAmount: 1799,
  });

  const [loyaltyStatus, setLoyaltyStatus] = useState<LoyaltyPresentation | null>(null);
  const [loyaltyStatusLoading, setLoyaltyStatusLoading] = useState(false);
  const [confirmationLoyaltyProgress, setConfirmationLoyaltyProgress] = useState<{
    previousSessionsInCurrentCycle: number;
    nextSessionsInCurrentCycle: number;
    nextRemainingToFree: number;
    unlocksReward: boolean;
  } | null>(null);

  /* -------------------------------------------------------
     04F. AVAILABILITY STATE
  ------------------------------------------------------- */

  const [availabilityDates, setAvailabilityDates] = useState<AvailabilityDate[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [bookingWindows, setBookingWindows] = useState<BookingWindow[]>([]);

  /* -------------------------------------------------------
     04G. MODAL + PET STATE
  ------------------------------------------------------- */

  const [isSlotsModalOpen, setIsSlotsModalOpen] = useState(false);
const [inclusionsPackage, setInclusionsPackage] = useState<string | null>(null);
const [planDetailsPackage, setPlanDetailsPackage] = useState<string | null>(null);

const openInclusions = (name: string) => setInclusionsPackage(name);
const closeInclusions = () => setInclusionsPackage(null);

const openPlanDetails = (name: string) => setPlanDetailsPackage(name);
const closePlanDetails = () => setPlanDetailsPackage(null);

const [selectedBookingWindowId, setSelectedBookingWindowId] = useState("");

  const [petCount, setPetCount] = useState(1);
const [pets, setPets] = useState<
  {
    sourcePetId?: string;
    isSavedProfile?: boolean;
    name: string;
    breed: string;
    stylingNotes: string;
    stylingImages: File[];
    groomingNotes: string;
    concernImages: File[];
  }[]
>([
  {
    sourcePetId: undefined,
    isSavedProfile: false,
    name: "",
    breed: "",
    stylingNotes: "",
    stylingImages: [],
    groomingNotes: "",
    concernImages: [],
  },
]);
const [expandedPetNotes, setExpandedPetNotes] = useState<number[]>([]);
const [activeBreedIndex, setActiveBreedIndex] = useState<number | null>(null);

const [savedPetsLoading, setSavedPetsLoading] = useState(false);
const [savedPetsError, setSavedPetsError] = useState("");
const [savedPetsLookupDoneForPhone, setSavedPetsLookupDoneForPhone] = useState("");
const [savedPets, setSavedPets] = useState<SavedPetLookupItem[]>([]);
const [selectedSavedPetIds, setSelectedSavedPetIds] = useState<string[]>([]);
const [blogPosts, setBlogPosts] = useState<BlogPostPreview[]>([]);

  /* =========================================================
     05. UI HELPERS
  ========================================================= */

  const handleHeroInputChange = (
  e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
) => {
  const { name, value } = e.target;

  if (name === "city" && value && !isSupportedCity(value)) {
    return;
  }

  setHeroForm((prev) => ({ ...prev, [name]: value }));
};

const getBookingWindowLabel = (window: {
  slotLabels: string[];
  displayLabel: string;
}) => {
  if (window.slotLabels.length === 1) return window.slotLabels[0];
  return window.displayLabel;
};

const getSelectedService = () => {
  return (
    SERVICE_OPTIONS.find((service) => service.name === heroForm.service) ||
    SERVICE_OPTIONS[0]
  );
};

const getServicePrice = (serviceName: string) => {
  const service = SERVICE_OPTIONS.find((item) => item.name === serviceName);
  return service?.price ?? SERVICE_OPTIONS[0].price;
};

const getServiceLabel = (serviceName: string) => {
  const service = SERVICE_OPTIONS.find((item) => item.name === serviceName);

  if (!service) {
    return `${serviceName} — ₹${SERVICE_OPTIONS[0].price}`;
  }

  return `${service.name} — ₹${service.price}`;
};

const isSupportedCity = (city: string) => {
  return SUPPORTED_CITIES.includes(
    city as (typeof SUPPORTED_CITIES)[number]
  );
};

const getBaseServicePrice = () => {
  return getServicePrice(heroForm.service);
};

const availableCoupons = [
  { code: "WELCOME10", label: "10% off", description: "Best for first booking" },
  { code: "FLAT200", label: "₹200 off", description: "Flat instant savings" },
];

const updatePricingPreview = (code: string, method = paymentMethod) => {
  const originalAmount = getBaseServicePrice();

  if (method === "pay_after_service") {
    setPricingPreview({
      originalAmount,
      finalAmount: originalAmount,
    });
    return;
  }

  const normalized = code.trim().toUpperCase();

  if (normalized === "WELCOME10") {
    setPricingPreview({
      originalAmount,
      finalAmount: Math.max(0, Math.round(originalAmount * 0.9)),
    });
    return;
  }

  if (normalized === "FLAT200") {
    setPricingPreview({
      originalAmount,
      finalAmount: Math.max(0, originalAmount - 200),
    });
    return;
  }

  setPricingPreview({ originalAmount, finalAmount: originalAmount });
};

const applyCouponCode = (code: string) => {
  if (paymentMethod === "pay_after_service") {
    setBookingCreateError("Coupons are only available for prepaid bookings.");
    return;
  }

  const normalized = code.trim().toUpperCase();
  setCouponCode(normalized);
  updatePricingPreview(normalized, "pay_now");
  setBookingCreateError("");
};

const selectedDateLabel = heroForm.requiredDate
  ? new Date(`${heroForm.requiredDate}T00:00:00`).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  : "";

const handlePaymentMethodChange = (method: "pay_now" | "pay_after_service") => {
  setPaymentMethod(method);
  setBookingCreateError("");

  if (method === "pay_after_service") {
    setCouponCode("");
    updatePricingPreview("", "pay_after_service");
    return;
  }

  updatePricingPreview(couponCode, "pay_now");
};

  /* =========================================================
     06. AVAILABILITY LOGIC
  ========================================================= */

  const fetchAvailabilityRange = async (date: string, count: number) => {
    const response = await fetch("/api/booking/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        city: heroForm.city,
        startDate: date,
        days: 10,
        petCount: count,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || "Failed to fetch availability");
    }

    const dates = data.dates || [];
    setAvailabilityDates(dates);
    setSelectedDate(date);

    const selectedDateBlock =
      dates.find((item: { date: string }) => item.date === date) || dates[0];

    const selectedWindows = selectedDateBlock?.bookingWindows || [];
    setBookingWindows(selectedWindows);

    if (selectedWindows.length > 0) {
      setSlotsMessage(
        `${selectedWindows.length} booking window(s) found for ${count} pet(s) on ${selectedDateBlock.date}.`
      );
    } else {
      setSlotsMessage(
        `No consecutive booking windows available for ${count} pet(s) on ${selectedDateBlock?.date || date}.`
      );
    }
  };

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    setSelectedBookingWindowId("");
    setBookingCreateError("");

    const selectedDateBlock = availabilityDates.find((item) => item.date === date);
    setBookingWindows(selectedDateBlock?.bookingWindows || []);

    if (selectedDateBlock && selectedDateBlock.bookingWindows.length > 0) {
      setSlotsMessage(
        `${selectedDateBlock.bookingWindows.length} booking window(s) found for ${petCount} pet(s) on ${date}.`
      );
    } else {
      setSlotsMessage(
        `No consecutive booking windows available for ${petCount} pet(s) on ${date}.`
      );
    }
  };

  const fetchSavedPetsByPhone = async (rawPhone: string) => {
  const phone = normalizePhoneForLookup(rawPhone);

  if (phone.length < 10) {
    setSavedPets([]);
    setSavedPetsError("");
    setSavedPetsLookupDoneForPhone("");
    return;
  }

  if (savedPetsLookupDoneForPhone === phone) {
    return;
  }

  try {
    setSavedPetsLoading(true);
    setSavedPetsError("");

    const response = await fetch(
      `/api/pets/by-phone?phone=${encodeURIComponent(phone)}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || "Failed to fetch saved companions");
    }

    const pets = (data?.pets || []) as SavedPetLookupItem[];
    const activePets = pets.filter((pet) => pet.petId);

    setSavedPets(activePets);
    setSavedPetsLookupDoneForPhone(phone);

    setSelectedSavedPetIds((prev) =>
      prev.filter((id) => activePets.some((pet) => pet.petId === id))
    );
  } catch (error) {
    console.error(error);
    setSavedPets([]);
    setSavedPetsLookupDoneForPhone("");
    setSavedPetsError(
      error instanceof Error
        ? error.message
        : "Could not fetch saved companions."
    );
  } finally {
    setSavedPetsLoading(false);
  }
};

const handleToggleSavedPet = (savedPet: SavedPetLookupItem) => {
  const alreadySelected = selectedSavedPetIds.includes(savedPet.petId);

  if (alreadySelected) {
    const nextSelectedIds = selectedSavedPetIds.filter((id) => id !== savedPet.petId);
    const nextPets = pets.filter((pet) => pet.sourcePetId !== savedPet.petId);
    const normalizedPets = nextPets.length > 0 ? nextPets : [createEmptyPet()];

    setSelectedSavedPetIds(nextSelectedIds);
    setPets(normalizedPets);
    setPetCount(normalizedPets.length);
    return;
  }

  const seededPet = {
    sourcePetId: savedPet.petId,
    isSavedProfile: true,
    name: savedPet.name || "",
    breed: savedPet.breed,
    stylingNotes: savedPet.defaultStylingNotes || "",
    stylingImages: [] as File[],
    groomingNotes: savedPet.defaultGroomingNotes || "",
    concernImages: [] as File[],
  };

  const nextPets = [...pets];
  const firstBlankIndex = nextPets.findIndex(
    (pet) =>
      !pet.sourcePetId &&
      !pet.name?.trim() &&
      !pet.breed?.trim() &&
      !pet.stylingNotes?.trim() &&
      !pet.groomingNotes?.trim() &&
      (!pet.stylingImages || pet.stylingImages.length === 0) &&
      (!pet.concernImages || pet.concernImages.length === 0)
  );

  const normalizedPets =
    firstBlankIndex >= 0
      ? nextPets.map((pet, index) => (index === firstBlankIndex ? seededPet : pet))
      : [...nextPets, seededPet];

  setSelectedSavedPetIds([...selectedSavedPetIds, savedPet.petId]);
  setPets(normalizedPets);
  setPetCount(normalizedPets.length);
};
const mapLoyaltyStatusResponse = (
  data: LoyaltyStatusResponse | { found: false }
): LoyaltyPresentation | null => {
  if (!data.found) return null;
  return {
    found: true,
    cycleSize: data.cycleSize,
    completedCount: data.completedCount,
    sessionsInCurrentCycle: data.sessionsInCurrentCycle,
    remainingToFree: data.remainingToFree,
    freeUnlocked: data.freeUnlocked,
    unlockedAt: data.unlockedAt,
    lastRedeemedAt: data.lastRedeemedAt,
    state: data.state,
    progressPercent: data.progressPercent,
    headline: data.headline,
    supportingText: data.supportingText,
  };
};

const fetchLoyaltyStatus = async (rawPhone: string) => {
  const phone = rawPhone.replace(/\D/g, "").slice(-10);
  if (phone.length < 10) {
    setLoyaltyStatus(null);
    return;
  }
  setLoyaltyStatusLoading(true);
  try {
    const res = await fetch(`/api/loyalty/status?phone=${encodeURIComponent(phone)}`);
    if (!res.ok) throw new Error("Failed to fetch loyalty status");
    const data = (await res.json()) as LoyaltyStatusResponse | { found: false };
    setLoyaltyStatus(mapLoyaltyStatusResponse(data));
  } catch (error) {
    console.error(error);
    setLoyaltyStatus(null);
  } finally {
    setLoyaltyStatusLoading(false);
  }
};

const handlePhoneBlurLookup = async () => {
  if (heroForm.phone.trim()) {
    await fetchSavedPetsByPhone(heroForm.phone);
    await fetchLoyaltyStatus(heroForm.phone);
  }
};

  const handleCheckAvailability = async (mobileStep = false) => {
    setSlotsError("");
    setSlotsMessage("");
    setBookingCreateError("");
    updatePricingPreview(couponCode);

    const missingFields = mobileStep
      ? !heroForm.city.trim() || !heroForm.service.trim() || !heroForm.requiredDate.trim()
      : !heroForm.name.trim() || !heroForm.phone.trim() || !heroForm.city.trim() || !heroForm.service.trim() || !heroForm.requiredDate.trim();

    if (missingFields) {
      setSlotsError(mobileStep ? "Please select city and visit date." : "Please fill all fields before checking availability.");
      return;
    }

    if (!mobileStep && heroForm.phone.trim()) {
      fetchSavedPetsByPhone(heroForm.phone);
      fetchLoyaltyStatus(heroForm.phone);
    }

    try {
      setSlotsLoading(true);
      setSelectedBookingWindowId("");
      await fetchAvailabilityRange(heroForm.requiredDate, petCount);
      if (mobileStep) {
        setMobileBookingStep("slot");
      } else {
        setIsSlotsModalOpen(true);
      }
    } catch (error) {
      console.error(error);
      setSlotsError("Could not check availability right now.");
    } finally {
      setSlotsLoading(false);
    }
  };

  /* =========================================================
     07. PET LOGIC
  ========================================================= */

  const handlePetCountChange = async (count: number) => {
    setPetCount(count);
    setBookingCreateError("");

    setPets((prev) => {
  if (count > prev.length) {
    const extraPets = Array.from({ length: count - prev.length }, () => createEmptyPet());
    return [...prev, ...extraPets];
  }
  return prev.slice(0, count);
});

setExpandedPetNotes((prev) => prev.filter((index) => index < count));

    if (heroForm.city.trim() && selectedDate.trim() && isSlotsModalOpen) {
      try {
        setSlotsLoading(true);
        setSlotsError("");
        setSlotsMessage("");
        setSelectedBookingWindowId("");
        await fetchAvailabilityRange(selectedDate, count);
      } catch (error) {
        console.error(error);
        setSlotsError("Could not refresh availability right now.");
      } finally {
        setSlotsLoading(false);
      }
    }
  };

  const handlePetFieldChange = (
  index: number,
  field: "name" | "breed",
  value: string
) => {
  setBookingCreateError("");
  setPets((prev) =>
    prev.map((pet, i) => (i === index ? { ...pet, [field]: value } : pet))
  );
};

  const normalizeBreedName = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const normalizedKey = trimmed.toLowerCase().replace(/[^a-z]/g, "");
  if (BREED_NORMALIZATION_MAP[normalizedKey]) {
    return BREED_NORMALIZATION_MAP[normalizedKey];
  }

  const exactMatch = BREED_OPTIONS.find(
    (breed) => breed.toLowerCase() === trimmed.toLowerCase()
  );

  if (exactMatch) return exactMatch;

  return trimmed
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
};

const getBreedSuggestions = (query: string) => {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length < 2) return [];

  return BREED_OPTIONS.filter((breed) =>
    breed.toLowerCase().includes(trimmed)
  ).slice(0, 8);
};

const handlePetBreedInputChange = (index: number, value: string) => {
  setBookingCreateError("");
  setActiveBreedIndex(index);

  setPets((prev) =>
    prev.map((pet, i) => (i === index ? { ...pet, breed: value } : pet))
  );
};

const handleSelectBreedSuggestion = (index: number, breed: string) => {
  const normalized = normalizeBreedName(breed);
  handlePetFieldChange(index, "breed", normalized);
  setActiveBreedIndex(null);
};

const handlePetBreedBlur = (index: number) => {
  window.setTimeout(() => {
    setPets((prev) =>
      prev.map((pet, i) =>
        i === index
          ? { ...pet, breed: normalizeBreedName(pet.breed) }
          : pet
      )
    );
    setActiveBreedIndex((current) => (current === index ? null : current));
  }, 120);
};

  const handlePetStylingImagesChange = (
  index: number,
  e: React.ChangeEvent<HTMLInputElement>
) => {
  const files = Array.from(e.target.files || []).slice(0, 5);
  setBookingCreateError("");
  setPets((prev) =>
    prev.map((pet, i) =>
      i === index ? { ...pet, stylingImages: files } : pet
    )
  );
};

const handlePetConcernImagesChange = (
  index: number,
  e: React.ChangeEvent<HTMLInputElement>
) => {
  const files = Array.from(e.target.files || []).slice(0, 5);
  setBookingCreateError("");
  setPets((prev) =>
    prev.map((pet, i) =>
      i === index ? { ...pet, concernImages: files } : pet
    )
  );
};

  const handleRemovePetStylingImage = (index: number, imageIndex: number) => {
  setPets((prev) =>
    prev.map((pet, i) =>
      i === index
        ? {
            ...pet,
            stylingImages: pet.stylingImages.filter((_, idx) => idx !== imageIndex),
          }
        : pet
    )
  );
};

const handleRemovePetConcernImage = (index: number, imageIndex: number) => {
  setPets((prev) =>
    prev.map((pet, i) =>
      i === index
        ? {
            ...pet,
            concernImages: pet.concernImages.filter((_, idx) => idx !== imageIndex),
          }
        : pet
    )
  );
};
  const handlePetStylingNotesChange = (index: number, value: string) => {
  setBookingCreateError("");
  setPets((prev) =>
    prev.map((pet, i) =>
      i === index ? { ...pet, stylingNotes: value } : pet
    )
  );
};

const handlePetGroomingNotesChange = (index: number, value: string) => {
  setBookingCreateError("");
  setPets((prev) =>
    prev.map((pet, i) =>
      i === index ? { ...pet, groomingNotes: value } : pet
    )
  );
};

const togglePetNotesPanel = (index: number) => {
  setExpandedPetNotes((prev) =>
    prev.includes(index) ? prev.filter((item) => item !== index) : [...prev, index]
  );
};

const createEmptyPet = () => ({
  sourcePetId: undefined as string | undefined,
  isSavedProfile: false,
  name: "",
  breed: "",
  stylingNotes: "",
  stylingImages: [] as File[],
  groomingNotes: "",
  concernImages: [] as File[],
});

const normalizePhoneForLookup = (phone: string) => phone.replace(/\D/g, "").slice(-10);

const getSavedPetAvatar = (pet: { imageUrl: string | null; species: "dog" | "cat" | "unknown" }) => {
  if (pet.imageUrl) return pet.imageUrl;
  return null;
};

  /* =========================================================
     08. TRACK BOOKING LOGIC
  ========================================================= */

  const openTrackBookingModal = () => {
  setTrackPhone(heroForm.phone || "");
  setTrackError("");
  setTrackSuccessMessage("");
  setTrackedBookings([]);
  setRescheduleBookingId("");
  setRescheduleAccessToken("");
  setRescheduleDate("");
  setRescheduleCity("");
  setRescheduleWindows([]);
  setSelectedRescheduleWindowId("");
  setRescheduleError("");
  setIsTrackBookingOpen(true);
};

  const closeTrackBookingModal = () => {
  setIsTrackBookingOpen(false);
  setTrackError("");
  setTrackSuccessMessage("");
  setTrackedBookings([]);
  setTrackLoading(false);
  setRescheduleBookingId("");
  setRescheduleAccessToken("");
  setRescheduleDate("");
  setRescheduleCity("");
  setRescheduleWindows([]);
  setSelectedRescheduleWindowId("");
  setRescheduleError("");
  setRescheduleLoading(false);
};

  const handleTrackBooking = async () => {
  if (!trackPhone.trim()) {
    setTrackError("Please enter your mobile number.");
    return;
  }

  try {
    setTrackLoading(true);
    setTrackError("");
    setTrackSuccessMessage("");
    setTrackedBookings([]);

    const response = await fetch("/api/booking/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone: trackPhone.trim(),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || "Failed to fetch bookings");
    }

    if (!data.bookings || data.bookings.length === 0) {
      setTrackError("No bookings found for this mobile number.");
      return;
    }

    setTrackedBookings(data.bookings);
    fetchLoyaltyStatus(trackPhone.trim());
  } catch (error) {
    console.error(error);
    setTrackError(
      error instanceof Error ? error.message : "Could not fetch bookings."
    );
  } finally {
    setTrackLoading(false);
  }
};

  const refreshTrackedBookings = async (phone: string) => {
  const response = await fetch("/api/booking/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || "Failed to refresh bookings");
  }

  setTrackedBookings(data.bookings || []);
};

  const handlePendingPaymentRetry = async () => {
    if (!pendingPaymentBookingId || !pendingPaymentAccessToken) return;
    setPendingPaymentRetrying(true);
    setPendingPaymentError("");
    try {
      const res = await fetch("/api/payment/razorpay/retry-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: pendingPaymentBookingId, accessToken: pendingPaymentAccessToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not start payment");

      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Could not load Razorpay.");

      const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!razorpayKey) throw new Error("Razorpay key missing.");

      const bookingId = pendingPaymentBookingId;

      const Razorpay = getRazorpay();
      const rz = new Razorpay({
        key: razorpayKey,
        amount: data.amount,
        currency: data.currency,
        order_id: data.orderId,
        name: "All Tails",
        description: "Complete your booking payment",
        handler: async function (response: RazorpayPaymentSuccessResponse) {
          const verifyRes = await fetch("/api/payment/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bookingId,
              accessToken: pendingPaymentAccessToken,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) throw new Error(verifyData?.error || "Verification failed");

          setPendingPaymentBookingId(null);
          setPendingPaymentAccessToken(null);
          setConfirmedBooking({
            bookingId,
            accessToken: pendingPaymentAccessToken ?? "",
            paymentStatus: verifyData.paymentStatus,
            status: verifyData.status,
            finalAmount: verifyData.finalAmount,
            originalAmount: verifyData.originalAmount,
            selectedDate: "",
            paymentMethod: "pay_now",
            serviceName: heroForm.service,
            city: heroForm.city,
            petCount: pets.length,
            bookingWindowLabel: selectedBookingWindow ? getBookingWindowLabel(selectedBookingWindow) : "",
            loyaltyRewardApplied: false,
            serviceAddress: "",
            serviceLandmark: "",
            servicePincode: "",
            serviceLocationUrl: "",
            addressStatus: "missing",
          });
          setConfirmedAddressDraft({
            serviceAddress: "",
            serviceLandmark: "",
            servicePincode: "",
            serviceLocationUrl: "",
          });
          setConfirmedAddressError("");
          setConfirmedAddressSuccess("");
        },
        modal: {
          ondismiss: async () => {
            await fetch("/api/payment/razorpay/mark-pending", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ bookingId, accessToken: pendingPaymentAccessToken, reason: "retry_dismissed" }),
            }).catch(console.error);
            setPendingPaymentError("You closed the payment window.");
          },
        },
      });

      rz.on("payment.failed", async (failRes: RazorpayFailureResponse) => {
        await fetch("/api/payment/razorpay/mark-pending", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId,
            accessToken: pendingPaymentAccessToken,
            reason: "retry_failed",
            gatewayError: failRes?.error?.description || null,
          }),
        }).catch(console.error);
        setPendingPaymentError(failRes?.error?.description || "Payment failed.");
      });

      setPendingPaymentBookingId(null);
      setPendingPaymentAccessToken(null);
      rz.open();
    } catch (err) {
      setPendingPaymentError(err instanceof Error ? err.message : "Could not retry payment.");
    } finally {
      setPendingPaymentRetrying(false);
    }
  };

  const handlePendingPaymentCancel = async () => {
    if (!pendingPaymentBookingId || !pendingPaymentAccessToken) return;
    setPendingPaymentCancelling(true);
    try {
      const res = await fetch("/api/booking/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: pendingPaymentBookingId, accessToken: pendingPaymentAccessToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not cancel booking");
      setPendingPaymentBookingId(null);
      setPendingPaymentAccessToken(null);
      setPendingPaymentError("");
    } catch (err) {
      setPendingPaymentError(err instanceof Error ? err.message : "Could not cancel.");
    } finally {
      setPendingPaymentCancelling(false);
    }
  };

  const handleCancelBooking = async (bookingId: string, accessToken: string | null) => {
  try {
    setTrackLoading(true);
    setTrackError("");
    setTrackSuccessMessage("");

    const response = await fetch("/api/booking/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, accessToken }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || "Failed to cancel booking");
    }

    await refreshTrackedBookings(trackPhone);

    setTrackSuccessMessage(
      "Your booking has been cancelled successfully. The updated status is now reflected below."
    );
  } catch (error) {
    console.error(error);
    setTrackError(
      error instanceof Error ? error.message : "Could not cancel booking."
    );
  } finally {
    setTrackLoading(false);
  }
};
  /* =========================================================
     09. RESCHEDULE LOGIC
  ========================================================= */

  const handleOpenReschedule = (booking: {
  id: string;
  accessToken: string | null;
  pets: { id: string }[];
  user: { city: string };
}) => {
  setRescheduleBookingId(booking.id);
  setRescheduleAccessToken(booking.accessToken ?? "");
  setReschedulePetCount(booking.pets.length);
  setRescheduleCity(booking.user.city);
  setRescheduleDate("");
  setRescheduleWindows([]);
  setSelectedRescheduleWindowId("");
  setRescheduleError("");
  setRescheduleSuccessMessage("");
  setTrackError("");
};
// ─── Companion management handlers ───────────────────────────────────────────

const createEmptyCompanionDraft = (): CompanionEditorDraft => ({
  name: "", breed: "", species: "unknown", avatarUrl: null,
  defaultGroomingNotes: "", defaultStylingNotes: "", defaultStylingReferenceUrls: [],
});

const createCompanionDraftFromProfile = (c: CompanionProfile): CompanionEditorDraft => ({
  name: c.name || "",
  breed: c.breed,
  species: c.species,
  avatarUrl: c.avatarUrl,
  defaultGroomingNotes: c.defaultGroomingNotes || "",
  defaultStylingNotes: c.defaultStylingNotes || "",
  defaultStylingReferenceUrls: c.defaultStylingReferenceUrls || [],
});

const loadCompanions = async (rawPhone: string) => {
  const phone = normalizePhoneForLookup(rawPhone);
  if (phone.length < 10) { setCompanions([]); setCompanionsError(""); return; }
  try {
    setCompanionsLoading(true);
    setCompanionsError("");
    const res = await fetch(`/api/pets?phone=${encodeURIComponent(phone)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Failed to load saved companions.");
    setCompanions(data.companions || []);
  } catch (err) {
    setCompanions([]);
    setCompanionsError(err instanceof Error ? err.message : "Could not load saved companions.");
  } finally {
    setCompanionsLoading(false);
  }
};

useEffect(() => {
  let cancelled = false;

  const loadBlogPosts = async () => {
    try {
      const res = await fetch("/api/blogs");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load blog posts.");
      if (!cancelled) {
        setBlogPosts((data.posts || []).slice(0, 3));
      }
    } catch (error) {
      console.error(error);
    }
  };

  void loadBlogPosts();

  return () => {
    cancelled = true;
  };
}, []);

const openCreateCompanionEditor = () => {
  setCompanionEditorMode("create");
  setActiveCompanionId(null);
  setCompanionDraft(createEmptyCompanionDraft());
  setCompanionEditorError("");
  setIsCompanionEditorOpen(true);
};

const openEditCompanionEditor = (companion: CompanionProfile) => {
  setCompanionEditorMode("edit");
  setActiveCompanionId(companion.id);
  setCompanionDraft(createCompanionDraftFromProfile(companion));
  setCompanionEditorError("");
  setIsCompanionEditorOpen(true);
};
const uploadCompanionAvatar = async (
  file: File
): Promise<UploadedCompanionAvatarRef> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/uploads/companion-avatar", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || `Failed to upload ${file.name}`);
  }

  return data.asset as UploadedCompanionAvatarRef;
};

const handleCompanionAvatarFileChange = async (
  e: React.ChangeEvent<HTMLInputElement>
) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    setCompanionEditorUploadingAvatar(true);
    setCompanionEditorError("");

    const uploaded = await uploadCompanionAvatar(file);

    setCompanionDraft((prev) => ({
      ...prev,
      avatarUrl: uploaded.publicUrl,
    }));
  } catch (error) {
    console.error(error);
    setCompanionEditorError(
      error instanceof Error ? error.message : "Could not upload avatar."
    );
  } finally {
    setCompanionEditorUploadingAvatar(false);
    e.target.value = "";
  }
};

const handleRemoveCompanionAvatar = () => {
  setCompanionDraft((prev) => ({
    ...prev,
    avatarUrl: null,
  }));
};
const uploadCompanionStylingReference = async (
  file: File
): Promise<UploadedCompanionStylingRef> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/uploads/companion-styling-reference", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || `Failed to upload ${file.name}`);
  }

  return data.asset as UploadedCompanionStylingRef;
};

const handleCompanionStylingReferenceFilesChange = async (
  e: React.ChangeEvent<HTMLInputElement>
) => {
  const files = Array.from(e.target.files || []).slice(0, 5);
  if (!files.length) return;

  try {
    setCompanionEditorUploadingStylingRefs(true);
    setCompanionEditorError("");

    const uploaded = await Promise.all(
      files.map((file) => uploadCompanionStylingReference(file))
    );

    setCompanionDraft((prev) => ({
      ...prev,
      defaultStylingReferenceUrls: [
        ...prev.defaultStylingReferenceUrls,
        ...uploaded.map((item) => item.publicUrl),
      ].slice(0, 5),
    }));
  } catch (error) {
    console.error(error);
    setCompanionEditorError(
      error instanceof Error
        ? error.message
        : "Could not upload styling references."
    );
  } finally {
    setCompanionEditorUploadingStylingRefs(false);
    e.target.value = "";
  }
};

const handleRemoveCompanionStylingReference = (index: number) => {
  setCompanionDraft((prev) => ({
    ...prev,
    defaultStylingReferenceUrls: prev.defaultStylingReferenceUrls.filter(
      (_, i) => i !== index
    ),
  }));
};
const closeCompanionEditor = () => {
  setIsCompanionEditorOpen(false);
  setActiveCompanionId(null);
  setCompanionEditorError("");
  setCompanionEditorSaving(false);
  setCompanionDraft(createEmptyCompanionDraft());
};

const createCompanion = async () => {
  const phone = normalizePhoneForLookup(heroForm.phone || trackPhone);
  if (phone.length < 10) { setCompanionEditorError("Enter a valid phone number first."); return; }
  if (!companionDraft.breed.trim()) { setCompanionEditorError("Breed is required."); return; }
  try {
    setCompanionEditorSaving(true);
    setCompanionEditorError("");
    const res = await fetch("/api/pets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
  phone,
  name: companionDraft.name.trim() || null,
  breed: companionDraft.breed.trim(),
  species: companionDraft.species,
  avatarUrl: companionDraft.avatarUrl,
  defaultGroomingNotes: companionDraft.defaultGroomingNotes.trim() || null,
  defaultStylingNotes: companionDraft.defaultStylingNotes.trim() || null,
  defaultStylingReferenceUrls: companionDraft.defaultStylingReferenceUrls,
}),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Failed to create companion.");
    setCompanions((prev) => [data.companion as CompanionProfile, ...prev]);
    closeCompanionEditor();
    await fetchSavedPetsByPhone(phone);
  } catch (err) {
    setCompanionEditorError(err instanceof Error ? err.message : "Could not create companion.");
  } finally {
    setCompanionEditorSaving(false);
  }
};

const updateCompanion = async () => {
  const phone = normalizePhoneForLookup(heroForm.phone || trackPhone);
  if (phone.length < 10) { setCompanionEditorError("Enter a valid phone number first."); return; }
  if (!activeCompanionId) { setCompanionEditorError("No companion selected."); return; }
  if (!companionDraft.breed.trim()) { setCompanionEditorError("Breed is required."); return; }
  try {
    setCompanionEditorSaving(true);
    setCompanionEditorError("");
    const res = await fetch(`/api/pets/${activeCompanionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
  phone,
  name: companionDraft.name.trim() || null,
  breed: companionDraft.breed.trim(),
  species: companionDraft.species,
  avatarUrl: companionDraft.avatarUrl,
  defaultGroomingNotes: companionDraft.defaultGroomingNotes.trim() || null,
  defaultStylingNotes: companionDraft.defaultStylingNotes.trim() || null,
  defaultStylingReferenceUrls: companionDraft.defaultStylingReferenceUrls,
}),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Failed to update companion.");
    const updated = data.companion as CompanionProfile;
    setCompanions((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    closeCompanionEditor();
    await fetchSavedPetsByPhone(phone);
  } catch (err) {
    setCompanionEditorError(err instanceof Error ? err.message : "Could not update companion.");
  } finally {
    setCompanionEditorSaving(false);
  }
};

const archiveCompanion = async (companionId: string) => {
  const phone = normalizePhoneForLookup(heroForm.phone || trackPhone);
  if (phone.length < 10) { setCompanionsError("Enter a valid phone number first."); return; }
  try {
    setCompanionsLoading(true);
    const res = await fetch(`/api/pets/${companionId}/archive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Failed to archive companion.");
    setCompanions((prev) => prev.filter((c) => c.id !== companionId));
    setSelectedSavedPetIds((prev) => prev.filter((id) => id !== companionId));
    setSavedPets((prev) => prev.filter((p) => p.petId !== companionId));
    setPets((prev) => {
      const next = prev.filter((p) => p.sourcePetId !== companionId);
      return next.length > 0 ? next : [createEmptyPet()];
    });
    closeCompanionEditor();
    await fetchSavedPetsByPhone(phone);
  } catch (err) {
    setCompanionsError(err instanceof Error ? err.message : "Could not archive companion.");
  } finally {
    setCompanionsLoading(false);
  }
};

const saveCompanionEditor = async () => {
  if (companionEditorMode === "create") { await createCompanion(); return; }
  await updateCompanion();
};

const handleBookingCardAction = (booking: TrackedBooking, action: BookingCardAction) => {
  switch (action.id) {
    case "complete_payment": handleRetryPayment(booking.id, booking.accessToken); return;
    case "reschedule": handleOpenReschedule(booking); return;
    case "cancel_booking": handleCancelBooking(booking.id, booking.accessToken); return;
    case "book_again":
      closeTrackBookingModal();
      setHeroForm((prev) => ({ ...prev, city: booking.user.city || prev.city, service: booking.service.name || prev.service }));
      openBookingFlow();
      return;
    case "view_details":
      setExpandedBookingId((current) => (current === booking.id ? null : booking.id));
      return;
  }
};

const closeRescheduleFlow = () => {
  setRescheduleBookingId("");
  setRescheduleAccessToken("");
  setRescheduleDate("");
  setRescheduleCity("");
  setRescheduleWindows([]);
  setSelectedRescheduleWindowId("");
  setRescheduleError("");
};

  const handleLoadRescheduleAvailability = async () => {
    if (!rescheduleDate.trim()) {
      setRescheduleError("Please choose a reschedule date.");
      return;
    }

    if (!rescheduleCity.trim()) {
      setRescheduleError("Booking city is missing.");
      return;
    }

    try {
      setRescheduleLoading(true);
      setRescheduleError("");
      setSelectedRescheduleWindowId("");
      setRescheduleWindows([]);

      const response = await fetch("/api/booking/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: rescheduleCity,
          startDate: rescheduleDate,
          days: 1,
          petCount: reschedulePetCount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to fetch reschedule windows");
      }

      const dateBlock = data?.dates?.[0];
      const windows = dateBlock?.bookingWindows || [];

      setRescheduleWindows(windows);

      if (!windows.length) {
        setRescheduleError("No booking windows available for that date.");
      }
    } catch (error) {
      console.error(error);
      setRescheduleError(
        error instanceof Error
          ? error.message
          : "Could not fetch reschedule availability."
      );
    } finally {
      setRescheduleLoading(false);
    }
  };

  const handleConfirmReschedule = async () => {
  const selectedWindow = rescheduleWindows.find(
    (window) => window.bookingWindowId === selectedRescheduleWindowId
  );

  if (!rescheduleBookingId || !selectedWindow) {
    setRescheduleError("Please select a new booking window.");
    return;
  }

  try {
    setRescheduleLoading(true);
    setRescheduleError("");
    setRescheduleSuccessMessage("");

    const response = await fetch("/api/booking/reschedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId: rescheduleBookingId,
        accessToken: rescheduleAccessToken,
        slotIds: selectedWindow.slotIds,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || "Failed to reschedule booking");
    }

    const successLabel = `${rescheduleDate} • ${getBookingWindowLabel(
      selectedWindow
    )}`;

    setRescheduleSuccessMessage(
      `Your booking has been rescheduled successfully to ${successLabel}. The updated booking details are now shown below.`
    );

    setRescheduleBookingId("");
    setRescheduleAccessToken("");
    setRescheduleDate("");
    setRescheduleCity("");
    setRescheduleWindows([]);
    setSelectedRescheduleWindowId("");

    await refreshTrackedBookings(trackPhone);
  } catch (error) {
    console.error(error);
    setRescheduleError(
      error instanceof Error ? error.message : "Could not reschedule booking."
    );
  } finally {
    setRescheduleLoading(false);
  }
};

  /* =========================================================
     10. BOOKING FLOW LOGIC
  ========================================================= */

  const renderLoyaltySummaryCard = (
    loyalty: LoyaltyPresentation | null,
    variant: "booking_flow" | "confirmation" | "my_bookings"
  ) => {
    if (!loyalty) return null;

    const compact = variant === "my_bookings";
    const isUnlocked = loyalty.state === "unlocked";
    const isRedeemed = loyalty.state === "redeemed";

    const shellClass = compact
      ? "rounded-[18px] border border-[#ece5ff] bg-[linear-gradient(180deg,#ffffff_0%,#fcfbff_100%)] p-4"
      : "rounded-[22px] border border-[#ece5ff] bg-[linear-gradient(180deg,#ffffff_0%,#fcfbff_100%)] p-4 sm:p-5 shadow-[0_14px_34px_rgba(73,44,120,0.06)]";

    const badgeClass = isUnlocked
      ? "bg-[#ecfdf3] text-[#15803d]"
      : isRedeemed
      ? "bg-[#fff7ed] text-[#c2410c]"
      : "bg-[#f4efff] text-[#6d5bd0]";

    const fillClass = isUnlocked
      ? "bg-[linear-gradient(90deg,#22c55e_0%,#86efac_100%)]"
      : isRedeemed
      ? "bg-[linear-gradient(90deg,#fb923c_0%,#fdba74_100%)]"
      : "bg-[linear-gradient(90deg,#7c6cf0_0%,#b7adff_100%)]";

    const titleClass = compact
      ? "text-[15px] font-bold tracking-[-0.02em] text-[#2a2346]"
      : "text-[17px] font-bold tracking-[-0.02em] text-[#2a2346]";

    const textClass = compact
      ? "mt-1 text-[12px] leading-[1.6] text-[#7a8196]"
      : "mt-1.5 text-[13px] leading-[1.65] text-[#7a8196]";

    return (
      <div className={shellClass}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className={titleClass}>{loyalty.headline}</div>
            <div className={textClass}>{loyalty.supportingText}</div>
          </div>
          <div className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeClass}`}>
            {isUnlocked ? "Unlocked" : isRedeemed ? "Redeemed" : `${loyalty.sessionsInCurrentCycle}/${loyalty.cycleSize}`}
          </div>
        </div>
        <div className="mt-4">
          <div className="h-2.5 overflow-hidden rounded-full bg-[#f2effa]">
            <motion.div
              initial={prefersReducedMotion ? false : { width: 0, opacity: 0.85 }}
              animate={{ width: getLoyaltyBarWidth(loyalty.progressPercent), opacity: 1 }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className={`h-full rounded-full ${fillClass}`}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-[#8a90a6]">
            <span>{loyalty.completedCount} completed total</span>
            <span>
              {isUnlocked ? "Reward ready" : isRedeemed ? "New cycle started" : `${loyalty.remainingToFree} to next free`}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const handleSaveConfirmedAddress = async () => {
    if (!confirmedBooking) return;

    try {
      setConfirmedAddressSaving(true);
      setConfirmedAddressError("");
      setConfirmedAddressSuccess("");

      const response = await fetch("/api/booking/address", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: confirmedBooking.bookingId,
          accessToken: confirmedBooking.accessToken,
          serviceAddress: confirmedAddressDraft.serviceAddress,
          serviceLandmark: confirmedAddressDraft.serviceLandmark,
          servicePincode: confirmedAddressDraft.servicePincode,
          serviceLocationUrl: confirmedAddressDraft.serviceLocationUrl,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Could not save address details");
      }

      setConfirmedBooking((prev) =>
        prev
          ? {
              ...prev,
              serviceAddress: data.addressInfo?.serviceAddress ?? prev.serviceAddress,
              serviceLandmark: data.addressInfo?.serviceLandmark ?? prev.serviceLandmark,
              servicePincode: data.addressInfo?.servicePincode ?? prev.servicePincode,
              serviceLocationUrl: data.addressInfo?.serviceLocationUrl ?? prev.serviceLocationUrl,
              addressStatus: data.addressInfo?.status ?? "complete",
            }
          : prev
      );

      setConfirmedAddressDraft({
        serviceAddress: data.addressInfo?.serviceAddress ?? confirmedAddressDraft.serviceAddress,
        serviceLandmark: data.addressInfo?.serviceLandmark ?? confirmedAddressDraft.serviceLandmark,
        servicePincode: data.addressInfo?.servicePincode ?? confirmedAddressDraft.servicePincode,
        serviceLocationUrl:
          data.addressInfo?.serviceLocationUrl ?? confirmedAddressDraft.serviceLocationUrl,
      });
      setConfirmedAddressSuccess("Address saved. Our team can now reach you smoothly.");
    } catch (error) {
      setConfirmedAddressError(
        error instanceof Error ? error.message : "Could not save address details."
      );
    } finally {
      setConfirmedAddressSaving(false);
    }
  };

  const LOYALTY_CYCLE_SIZE = 5;

  const renderAnimatedConfirmationLoyaltyCard = () => {
    if (!confirmedBooking) return null;

    if (confirmedBooking.loyaltyRewardApplied) {
      return (
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mt-5 rounded-[22px] border border-[#f6df9f] bg-[linear-gradient(180deg,#fffdf6_0%,#fff8e8_100%)] p-4 shadow-[0_14px_34px_rgba(245,158,11,0.10)]"
        >
          <div className="flex items-start gap-3">
            <motion.div
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.35 }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fff1bf] text-[20px]"
            >
              ✨
            </motion.div>
            <div>
              <div className="text-[14px] font-bold text-[#9a6700]">Free grooming applied</div>
              <p className="mt-1 text-[12px] leading-[1.6] text-[#a16207]">This booking used your loyalty reward.</p>
            </div>
          </div>
        </motion.div>
      );
    }

    if (!confirmationLoyaltyProgress) {
      return loyaltyStatus ? (
        <div className="mt-5">
          {renderLoyaltySummaryCard(loyaltyStatus, "confirmation")}
        </div>
      ) : null;
    }

    const previousPercent =
      (confirmationLoyaltyProgress.previousSessionsInCurrentCycle / LOYALTY_CYCLE_SIZE) * 100;
    const nextPercent =
      (confirmationLoyaltyProgress.nextSessionsInCurrentCycle / LOYALTY_CYCLE_SIZE) * 100;

    return (
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className={`mt-5 rounded-[22px] border p-4 shadow-[0_14px_34px_rgba(73,44,120,0.06)] ${
          confirmationLoyaltyProgress.unlocksReward
            ? "border-[#d9f0df] bg-[linear-gradient(180deg,#f7fff9_0%,#f1fcf5_100%)]"
            : "border-[#ece5ff] bg-[linear-gradient(180deg,#ffffff_0%,#fcfbff_100%)]"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.35 }}
              className="text-[16px] font-bold tracking-[-0.02em] text-[#2a2346]"
            >
              {confirmationLoyaltyProgress.unlocksReward
                ? "Free session unlocked"
                : confirmationLoyaltyProgress.nextRemainingToFree === 1
                ? "1 session to your free grooming"
                : `${confirmationLoyaltyProgress.nextRemainingToFree} sessions to your free grooming`}
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.22, duration: 0.35 }}
              className="mt-1.5 text-[12px] leading-[1.6] text-[#7a8196]"
            >
              {confirmationLoyaltyProgress.unlocksReward
                ? "Your next eligible booking can use this reward."
                : "This confirmed booking has moved your loyalty progress forward."}
            </motion.p>
          </div>
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.35 }}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              confirmationLoyaltyProgress.unlocksReward
                ? "bg-[#ecfdf3] text-[#15803d]"
                : "bg-[#f4efff] text-[#6d5bd0]"
            }`}
          >
            {confirmationLoyaltyProgress.nextSessionsInCurrentCycle}/{LOYALTY_CYCLE_SIZE}
          </motion.div>
        </div>

        <div className="mt-4">
          <div className="h-2.5 overflow-hidden rounded-full bg-[#f2effa]">
            <motion.div
              initial={prefersReducedMotion ? false : { width: `${previousPercent}%` }}
              animate={{ width: `${nextPercent}%` }}
              transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.35, duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
              className={`h-full rounded-full ${
                confirmationLoyaltyProgress.unlocksReward
                  ? "bg-[linear-gradient(90deg,#22c55e_0%,#86efac_100%)]"
                  : "bg-[linear-gradient(90deg,#7c6cf0_0%,#b7adff_100%)]"
              }`}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-[#8a90a6]">
            <span>
              {confirmationLoyaltyProgress.previousSessionsInCurrentCycle}/{LOYALTY_CYCLE_SIZE}
              {" → "}
              {confirmationLoyaltyProgress.nextSessionsInCurrentCycle}/{LOYALTY_CYCLE_SIZE}
            </span>
            <span>
              {confirmationLoyaltyProgress.unlocksReward
                ? "Reward ready"
                : `${confirmationLoyaltyProgress.nextRemainingToFree} to next free`}
            </span>
          </div>
        </div>

        {confirmationLoyaltyProgress.unlocksReward ? (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={prefersReducedMotion ? { duration: 0 } : { delay: 1.05, duration: 0.4 }}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#d9f0df] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#15803d]"
          >
            <span>✦</span>
            Reward unlocked for your next eligible booking
          </motion.div>
        ) : null}
      </motion.div>
    );
  };

  const closeSlotsModal = () => {
    setIsSlotsModalOpen(false);
    setSelectedBookingWindowId("");
    setPetCount(1);
    setAvailabilityDates([]);
    setSelectedDate("");
    setBookingWindows([]);
    setBookingCreateError("");
    setConfirmedBooking(null);
    setConfirmationLoyaltyProgress(null);
    setPaymentMethod("pay_now");
    setCouponCode("");
    setPricingPreview({
      originalAmount: getBaseServicePrice(),
      finalAmount: getBaseServicePrice(),
    });
    setPets([createEmptyPet()]);
setExpandedPetNotes([]);
setSelectedSavedPetIds([]);
setSavedPets([]);
setSavedPetsError("");
setSavedPetsLookupDoneForPhone("");
setActiveBreedIndex(null);
setIsCalendarOpen(false);
  };

  const selectedBookingWindow =
    bookingWindows.find(
      (window) => window.bookingWindowId === selectedBookingWindowId
    ) || null;

  useEffect(() => {
    if (!isSlotsModalOpen || confirmedBooking) return;
    if (!["details", "pets", "payment"].includes(mobileBookingStep)) return;
    if (selectedBookingWindowId) return;

    setBookingCreateError("Please select a booking window first.");
    setMobileBookingStep("slot");
  }, [confirmedBooking, isSlotsModalOpen, mobileBookingStep, selectedBookingWindowId]);

  const canContinueBooking =
    !!selectedBookingWindowId && pets.every((pet) => pet.breed.trim().length > 0);

  const loadRazorpayScript = () => {
    return new Promise<boolean>((resolve) => {
      const existingScript = document.querySelector(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
      );

      if (existingScript) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const getRazorpay = () => {
    if (typeof window === "undefined" || !window.Razorpay) {
      throw new Error("Razorpay checkout is unavailable.");
    }

    return window.Razorpay as RazorpayConstructor;
  };

  const getErrorMessage = (value: unknown, fallback: string) => {
    if (
      typeof value === "object" &&
      value !== null &&
      "error" in value &&
      typeof value.error === "string"
    ) {
      return value.error;
    }

    return fallback;
  };

const uploadBookingAsset = async (
  file: File,
  kind: "styling_reference" | "concern_photo",
  petIndex: number
): Promise<UploadedAssetRef> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("kind", kind);
  formData.append("petIndex", String(petIndex));

  const response = await fetch("/api/uploads/booking-asset", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || `Failed to upload ${file.name}`);
  }

  return data.asset as UploadedAssetRef;
};
  const handleCreateBooking = async () => {
  if (!selectedBookingWindow) {
    setBookingCreateError("Please select a booking window.");
    return;
  }

  if (!pets.every((pet) => pet.breed.trim().length > 0)) {
    setBookingCreateError("Please fill breed for all pets.");
    return;
  }

  try {
    setBookingCreateLoading(true);
    setBookingCreateError("");

    const petsPayload = await Promise.all(
      pets.map(async (pet, index) => {
        const stylingAssets = await Promise.all(
          pet.stylingImages.map((file) =>
            uploadBookingAsset(file, "styling_reference", index)
          )
        );

        const concernAssets = await Promise.all(
          pet.concernImages.map((file) =>
            uploadBookingAsset(file, "concern_photo", index)
          )
        );

        return {
          sourcePetId: pet.sourcePetId,
          isSavedProfile: !!pet.sourcePetId,
          name: pet.name.trim(),
          breed: pet.breed.trim(),
          stylingNotes: pet.stylingNotes.trim(),
          groomingNotes: pet.groomingNotes.trim(),
          stylingAssets,
          concernAssets,
        };
      })
    );

    const bookingResponse = await fetch("/api/booking/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: heroForm.name,
        phone: heroForm.phone,
        city: heroForm.city,
        serviceName: heroForm.service,
        selectedDate,
        bookingWindowId: selectedBookingWindow.bookingWindowId,
        slotIds: selectedBookingWindow.slotIds,
        paymentMethod,
        couponCode: paymentMethod === "pay_now" ? couponCode : "",
        pets: petsPayload,
      }),
    });

    const bookingPayload = (await bookingResponse.json()) as BookingCreateResponse | { error?: string };

    if (!bookingResponse.ok) {
      throw new Error(getErrorMessage(bookingPayload, "Failed to create booking"));
    }

    const bookingData = bookingPayload as BookingCreateResponse;

    setPricingPreview({
      originalAmount: bookingData.originalAmount,
      finalAmount: bookingData.finalAmount,
    });

    if (!bookingData.paymentOrder) {
      setConfirmationLoyaltyProgress(
        getAnimatedConfirmationLoyaltyProgress({ loyalty: bookingData.loyalty })
      );
      setConfirmedBooking({
        bookingId: bookingData.bookingId,
        accessToken: bookingData.accessToken,
        paymentStatus: bookingData.paymentStatus,
        status: bookingData.status,
        finalAmount: bookingData.finalAmount,
        originalAmount: bookingData.originalAmount,
        selectedDate,
        paymentMethod,
        serviceName: heroForm.service,
        city: heroForm.city,
        petCount: pets.length,
        bookingWindowLabel: getBookingWindowLabel(selectedBookingWindow),
        loyaltyRewardApplied: bookingData.loyalty?.rewardApplied ?? false,
        serviceAddress: "",
        serviceLandmark: "",
        servicePincode: "",
        serviceLocationUrl: "",
        addressStatus: "missing",
      });
      setConfirmedAddressDraft({
        serviceAddress: "",
        serviceLandmark: "",
        servicePincode: "",
        serviceLocationUrl: "",
      });
      setConfirmedAddressError("");
      setConfirmedAddressSuccess("");
      const confirmPhone = heroForm.phone || trackPhone;
      if (confirmPhone.trim()) fetchLoyaltyStatus(confirmPhone);
      return;
    }

    const razorpayLoaded = await loadRazorpayScript();
    if (!razorpayLoaded) {
      throw new Error("Could not load Razorpay checkout.");
    }

    const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!razorpayKey) {
      throw new Error("Razorpay public key is missing.");
    }

    const Razorpay = getRazorpay();
    const razorpay = new Razorpay({
      key: razorpayKey,
      amount: bookingData.paymentOrder.amount,
      currency: bookingData.paymentOrder.currency,
      name: "All Tails",
      description: "Pet grooming booking payment",
      order_id: bookingData.paymentOrder.orderId,
      handler: async function (response: RazorpayPaymentSuccessResponse) {
        try {
          const verifyResponse = await fetch("/api/payment/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bookingId: bookingData.bookingId,
              accessToken: bookingData.accessToken,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });

          const verifyData = await verifyResponse.json();

          if (!verifyResponse.ok) {
            throw new Error(verifyData?.error || "Payment verification failed");
          }

          setConfirmationLoyaltyProgress(
            getAnimatedConfirmationLoyaltyProgress({ loyalty: bookingData.loyalty })
          );
          setConfirmedBooking({
            bookingId: bookingData.bookingId,
            accessToken: bookingData.accessToken,
            paymentStatus: verifyData.paymentStatus,
            status: verifyData.status,
            finalAmount: bookingData.finalAmount,
            originalAmount: bookingData.originalAmount,
            selectedDate,
            paymentMethod,
            serviceName: heroForm.service,
            city: heroForm.city,
            petCount: pets.length,
            bookingWindowLabel: getBookingWindowLabel(selectedBookingWindow),
            loyaltyRewardApplied: bookingData.loyalty?.rewardApplied ?? false,
            serviceAddress: "",
            serviceLandmark: "",
            servicePincode: "",
            serviceLocationUrl: "",
            addressStatus: "missing",
          });
          setConfirmedAddressDraft({
            serviceAddress: "",
            serviceLandmark: "",
            servicePincode: "",
            serviceLocationUrl: "",
          });
          setConfirmedAddressError("");
          setConfirmedAddressSuccess("");
          const confirmPhone = heroForm.phone || trackPhone;
          if (confirmPhone.trim()) fetchLoyaltyStatus(confirmPhone);

          setBookingCreateError("");
        } catch (error) {
          console.error(error);
          setBookingCreateError(
            error instanceof Error ? error.message : "Payment verification failed."
          );
        }
      },
      prefill: {
        name: heroForm.name,
        contact: heroForm.phone,
      },
      notes: {
        bookingId: bookingData.bookingId,
        service: heroForm.service,
        date: selectedDate,
      },
      theme: {
        color: "#6d5bd0",
      },
      modal: {
        ondismiss: async function () {
          try {
            await fetch("/api/payment/razorpay/mark-pending", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                bookingId: bookingData.bookingId,
                accessToken: bookingData.accessToken,
                reason: "checkout_dismissed",
              }),
            });
          } catch (e) {
            console.error(e);
          }
          setPendingPaymentError("You closed the payment window.");
          setPendingPaymentBookingId(bookingData.bookingId);
          setPendingPaymentAccessToken(bookingData.accessToken);
        },
      },
    });

    razorpay.on("payment.failed", async function (response: RazorpayFailureResponse) {
      try {
        await fetch("/api/payment/razorpay/mark-pending", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId: bookingData.bookingId,
            accessToken: bookingData.accessToken,
            reason: "payment_failed",
            gatewayError: response?.error?.description || null,
          }),
        });
      } catch (e) {
        console.error(e);
      }
      setPendingPaymentError(response?.error?.description || "Payment failed.");
      setPendingPaymentBookingId(bookingData.bookingId);
      setPendingPaymentAccessToken(bookingData.accessToken);
    });

    razorpay.open();
  } catch (error) {
    console.error(error);
    setBookingCreateError(
      error instanceof Error ? error.message : "Could not create booking."
    );
  } finally {
    setBookingCreateLoading(false);
  }
};

  /* =========================================================
     12. RENDER
  ========================================================= */
const hasConfirmedAddressMinimum =
  !confirmedBooking ||
  Boolean(
    confirmedAddressDraft.serviceAddress.trim() &&
      confirmedAddressDraft.serviceLandmark.trim() &&
      confirmedAddressDraft.servicePincode.trim()
  );
const isAddressCaptureRequired = Boolean(confirmedBooking && !hasConfirmedAddressMinimum);
const isCompactTrackEntry = trackedBookings.length === 0;
  return (
  <main className="min-h-screen bg-white pb-[88px] text-slate-900 lg:pb-0">

    {/* Payment-failed recovery modal */}
    {pendingPaymentBookingId ? (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-[24px] bg-white p-6 shadow-2xl">
          <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-[#fff3cd]">
            <span className="text-[22px]">⚠️</span>
          </div>
          <h2 className="mt-3 text-[18px] font-bold text-[#2a2346]">Payment incomplete</h2>
          <p className="mt-1.5 text-[14px] leading-[1.5] text-[#6b7280]">
            {pendingPaymentError || "Your payment didn't go through."}
          </p>
          <p className="mt-1 text-[12px] text-[#9aa1b2]">
            Your slot is held for 15 minutes. You can retry now or cancel to free it.
          </p>

          <div className="mt-5 flex flex-col gap-2.5">
            <button
              type="button"
              disabled={pendingPaymentRetrying || pendingPaymentCancelling}
              onClick={handlePendingPaymentRetry}
              className="flex h-[48px] w-full items-center justify-center rounded-[14px] bg-[#6d5bd0] text-[14px] font-bold text-white disabled:opacity-60"
            >
              {pendingPaymentRetrying ? "Opening payment…" : "Try payment again"}
            </button>
            <button
              type="button"
              disabled={pendingPaymentRetrying || pendingPaymentCancelling}
              onClick={handlePendingPaymentCancel}
              className="flex h-[44px] w-full items-center justify-center rounded-[14px] border border-[#ffd7d7] bg-[#fff8f8] text-[14px] font-semibold text-[#b42318] disabled:opacity-60"
            >
              {pendingPaymentCancelling ? "Cancelling…" : "Cancel booking"}
            </button>
          </div>
        </div>
      </div>
    ) : null}
    {/* =====================================================
    12A. BOOKING MODAL
===================================================== */}
{isSlotsModalOpen ? (
  <div className="fixed inset-0 z-[100] bg-[rgba(17,12,33,0.58)] backdrop-blur-[3px] lg:flex lg:items-center lg:justify-center lg:px-4 lg:py-6">
    <div className="fixed inset-x-0 bottom-0 top-0 w-full overflow-y-auto bg-[linear-gradient(180deg,#ffffff_0%,#fcfbff_48%,#fbf8ff_100%)] pt-[max(16px,env(safe-area-inset-top))] pb-[max(20px,env(safe-area-inset-bottom))] lg:relative lg:inset-auto lg:flex lg:h-[min(920px,92vh)] lg:w-[min(1120px,96vw)] lg:flex-col lg:overflow-hidden lg:rounded-[36px] lg:border lg:border-[#e9e0fb] lg:bg-white lg:shadow-[0_30px_80px_rgba(29,16,70,0.18)]">
      <div className="pointer-events-none absolute inset-0 rounded-[36px] ring-1 ring-[#f3ecff] lg:hidden" />

      {/* ── MOBILE STEP FLOW ── */}
      <div className="lg:hidden">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between border-b border-[#f0ecff] bg-white/90 px-4 pb-3 pt-1 backdrop-blur">
          <button
            type="button"
onClick={() => {
  if (confirmedBooking && !hasConfirmedAddressMinimum) return;
  if (confirmedBooking) {
    closeSlotsModal();
  } else if (mobileBookingStep === "setup") {
    closeSlotsModal();
  } else if (mobileBookingStep === "slot") {
    setMobileBookingStep("setup");
  } else if (mobileBookingStep === "details") {
    setMobileBookingStep("slot");
  } else if (mobileBookingStep === "pets") {
    setMobileBookingStep("details");
  } else if (mobileBookingStep === "payment") {
    setMobileBookingStep("pets");
  }
}}
            disabled={!!confirmedBooking && !hasConfirmedAddressMinimum}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ece8f5] bg-white text-[#2a2346] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {confirmedBooking ? (
  <X className="h-4 w-4" />
) : (
  <ChevronLeft className="h-4 w-4" />
)}
          </button>

          {!confirmedBooking && (
            <div className="flex items-center gap-2">
              {(["setup", "slot", "details", "pets", "payment"] as const).map((step, i) => (
                <div
                  key={step}
                  className={`h-2 rounded-full transition-all duration-300 ${mobileBookingStep === step ? "w-6 bg-[#6d5bd0]" : i < (["setup", "slot", "details", "pets", "payment"] as const).indexOf(mobileBookingStep) ? "w-2 bg-[#6d5bd0]/40" : "w-2 bg-[#e5e1f5]"}`}
                />
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              if (!hasConfirmedAddressMinimum) return;
              closeSlotsModal();
            }}
            disabled={!!confirmedBooking && !hasConfirmedAddressMinimum}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ece8f5] bg-white text-[#2a2346] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mobile confirmation */}
        {confirmedBooking ? (
          <div className="relative flex flex-col" style={{ height: "calc(100% - 57px)" }}>
            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-4 pb-6 pt-7">
              <div className={isAddressCaptureRequired ? "pointer-events-none select-none opacity-45 blur-[2px]" : ""}>

              {/* Success hero */}
              <div className="flex flex-col items-center text-center">
                <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-[#eefcf4]">
                  <div className="flex h-[58px] w-[58px] items-center justify-center rounded-full bg-[#18a34a] text-[28px] text-white">✓</div>
                </div>
                <div className="mt-5 inline-flex items-center rounded-full border border-[#bfe6cb] bg-[#f2fcf5] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#11804d]">
                  Booking Confirmed
                </div>
                <h3 className="mt-4 text-[26px] font-black leading-[1.1] tracking-[-0.04em] text-[#1f1f2c]">Your session is reserved!</h3>
                <p className="mx-auto mt-2.5 max-w-[270px] text-[14px] leading-[1.75] text-[#6b7280]">Our team will reach out with visit details shortly.</p>
              </div>

              {/* Loyalty block on confirmation */}
              {renderAnimatedConfirmationLoyaltyCard()}

              {/* Booking summary card */}
              <div className="mt-6 rounded-[24px] border border-[#e9e0fb] bg-[#fbf9ff] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6d5bd0]">Booking ID</div>
                    <div className="mt-1 break-all text-[14px] font-black text-[#2a2346]">{confirmedBooking.bookingId}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(confirmedBooking.bookingId);
                      setBookingIdCopied(true);
                      setTimeout(() => setBookingIdCopied(false), 2000);
                    }}
                    className="shrink-0 rounded-full border border-[#ddd1fb] bg-white px-3.5 py-1.5 text-[12px] font-semibold text-[#6d5bd0]"
                  >
                    {bookingIdCopied ? "Copied!" : "Copy"}
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  {[
                    ["SERVICE", confirmedBooking.serviceName],
                    ["CITY", confirmedBooking.city],
                    ["DATE", confirmedBooking.selectedDate],
                    ["WINDOW", confirmedBooking.bookingWindowLabel],
                    ["PETS", `${confirmedBooking.petCount} pet${confirmedBooking.petCount > 1 ? "s" : ""}`],
                    ["AMOUNT", `₹${confirmedBooking.finalAmount}`],
                    ["PAYMENT", confirmedBooking.paymentMethod === "pay_now" ? "Pay Now" : "Pay After Service"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[16px] border border-[#e9e0fb] bg-white p-3">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8b90a0]">{label}</div>
                      <div className="mt-1 text-[13px] font-bold leading-[1.3] text-[#2a2346]">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`mt-4 rounded-[24px] border border-[#e9e0fb] bg-white p-5 ${isAddressCaptureRequired ? "hidden" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-bold uppercase tracking-[0.14em] text-[#6d5bd0]">
                      Save service address
                    </div>
                    <p className="mt-1 text-[12px] leading-[1.6] text-[#6b7280]">
                      Please save the complete visit address before closing this booking screen.
                    </p>
                  </div>
                  <div
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                      confirmedBooking.addressStatus === "complete"
                        ? "bg-[#eefcf4] text-[#11804d]"
                        : confirmedBooking.addressStatus === "partial"
                          ? "bg-[#fff7ed] text-[#c2410c]"
                          : "bg-[#f4efff] text-[#6d5bd0]"
                    }`}
                  >
                    {confirmedBooking.addressStatus === "complete"
                      ? "Saved"
                      : confirmedBooking.addressStatus === "partial"
                        ? "Incomplete"
                        : "Required"}
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <textarea
                    value={confirmedAddressDraft.serviceAddress}
                    onChange={(event) =>
                      setConfirmedAddressDraft((prev) => ({ ...prev, serviceAddress: event.target.value }))
                    }
                    placeholder="Full address"
                    rows={3}
                    className="w-full rounded-[16px] border border-[#e4dcf8] px-4 py-3 text-[13px] outline-none focus:border-[#6d5bd0]"
                  />
                  <input
                    type="text"
                    value={confirmedAddressDraft.serviceLandmark}
                    onChange={(event) =>
                      setConfirmedAddressDraft((prev) => ({ ...prev, serviceLandmark: event.target.value }))
                    }
                    placeholder="Nearby landmark"
                    className="h-[46px] w-full rounded-[16px] border border-[#e4dcf8] px-4 text-[13px] outline-none focus:border-[#6d5bd0]"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={confirmedAddressDraft.servicePincode}
                    onChange={(event) =>
                      setConfirmedAddressDraft((prev) => ({ ...prev, servicePincode: event.target.value }))
                    }
                    placeholder="Pin code"
                    className="h-[46px] w-full rounded-[16px] border border-[#e4dcf8] px-4 text-[13px] outline-none focus:border-[#6d5bd0]"
                  />
                  <input
                    type="url"
                    value={confirmedAddressDraft.serviceLocationUrl}
                    onChange={(event) =>
                      setConfirmedAddressDraft((prev) => ({ ...prev, serviceLocationUrl: event.target.value }))
                    }
                    placeholder="Google Maps link (optional)"
                    className="h-[46px] w-full rounded-[16px] border border-[#e4dcf8] px-4 text-[13px] outline-none focus:border-[#6d5bd0]"
                  />
                </div>

                {confirmedAddressError ? (
                  <div className="mt-3 rounded-[14px] border border-[#fecdd3] bg-[#fff1f2] px-4 py-3 text-[12px] text-[#be123c]">
                    {confirmedAddressError}
                  </div>
                ) : null}
                {confirmedAddressSuccess ? (
                  <div className="mt-3 rounded-[14px] border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-[12px] text-[#15803d]">
                    {confirmedAddressSuccess}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={handleSaveConfirmedAddress}
                  disabled={confirmedAddressSaving}
                  className="mt-4 flex h-[46px] w-full items-center justify-center rounded-[16px] bg-[#6d5bd0] text-[13px] font-semibold text-white disabled:opacity-60"
                >
                  {confirmedAddressSaving ? "Saving..." : "Save address details"}
                </button>
              </div>

              {/* What happens next */}
              <div className="mt-4 rounded-[24px] border border-[#e9e0fb] bg-white p-5">
                <div className="text-[13px] font-bold uppercase tracking-[0.14em] text-[#6d5bd0]">What happens next</div>
                <div className="mt-4 space-y-4">
                  {[
                    ["1", "Window confirmed", "We'll send your grooming window (date + time) via WhatsApp within 24 hrs."],
                    ["2", "Team assigned", "Your dedicated groomer will be assigned and introduced before the visit."],
                    ["3", "Visit day", "Our team arrives at your door — no travel stress for your pet."],
                    ["4", "Post-session update", "We'll share photos and a care note once the session is done."],
                  ].map(([num, title, desc]) => (
                    <div key={num} className="flex gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f0ecff] text-[12px] font-black text-[#6d5bd0]">{num}</div>
                      <div>
                        <div className="text-[13px] font-bold text-[#2a2346]">{title}</div>
                        <div className="mt-0.5 text-[12px] leading-[1.6] text-[#6b7280]">{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Support card */}
              <div className="mt-4 rounded-[24px] border border-[#e9e0fb] bg-white p-5">
                <div className="text-[13px] font-bold text-[#2a2346]">Need help?</div>
                <p className="mt-1 text-[12px] leading-[1.6] text-[#6b7280]">Our team is available 9 AM – 7 PM, Mon–Sat.</p>
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <a
                    href={WHATSAPP_HREF}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-[44px] items-center justify-center gap-2 rounded-[14px] border border-[#c3f0d5] bg-[#f2fcf5] text-[13px] font-semibold text-[#11804d]"
                  >
                    <span>💬</span> WhatsApp
                  </a>
                  <a
                    href={SUPPORT_PHONE_HREF}
                    className="flex h-[44px] items-center justify-center gap-2 rounded-[14px] border border-[#e9e0fb] bg-[#fbf9ff] text-[13px] font-semibold text-[#6d5bd0]"
                  >
                    <span>📞</span> Call us
                  </a>
                </div>
              </div>
              </div>

            </div>

            {isAddressCaptureRequired ? (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-[rgba(255,255,255,0.18)] px-4 py-6 backdrop-blur-[3px]">
                <div className="w-full max-w-[420px] rounded-[24px] border border-[#d9d2f3] bg-white p-5 shadow-[0_20px_48px_rgba(109,91,208,0.12)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[13px] font-bold uppercase tracking-[0.14em] text-[#6d5bd0]">
                        Save service address
                      </div>
                      <p className="mt-1 text-[12px] leading-[1.6] text-[#6b7280]">
                        Save your full visit address first. The booking confirmation below will unlock right after this.
                      </p>
                    </div>
                    <div className="rounded-full bg-[#f4efff] px-3 py-1 text-[11px] font-semibold text-[#6d5bd0]">
                      Required
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <textarea
                      value={confirmedAddressDraft.serviceAddress}
                      onChange={(event) =>
                        setConfirmedAddressDraft((prev) => ({ ...prev, serviceAddress: event.target.value }))
                      }
                      placeholder="Full address"
                      rows={3}
                      className="w-full rounded-[16px] border border-[#e4dcf8] px-4 py-3 text-[13px] outline-none focus:border-[#6d5bd0]"
                    />
                    <input
                      type="text"
                      value={confirmedAddressDraft.serviceLandmark}
                      onChange={(event) =>
                        setConfirmedAddressDraft((prev) => ({ ...prev, serviceLandmark: event.target.value }))
                      }
                      placeholder="Nearby landmark"
                      className="h-[46px] w-full rounded-[16px] border border-[#e4dcf8] px-4 text-[13px] outline-none focus:border-[#6d5bd0]"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={confirmedAddressDraft.servicePincode}
                      onChange={(event) =>
                        setConfirmedAddressDraft((prev) => ({ ...prev, servicePincode: event.target.value }))
                      }
                      placeholder="Pin code"
                      className="h-[46px] w-full rounded-[16px] border border-[#e4dcf8] px-4 text-[13px] outline-none focus:border-[#6d5bd0]"
                    />
                    <input
                      type="url"
                      value={confirmedAddressDraft.serviceLocationUrl}
                      onChange={(event) =>
                        setConfirmedAddressDraft((prev) => ({ ...prev, serviceLocationUrl: event.target.value }))
                      }
                      placeholder="Google Maps link (optional)"
                      className="h-[46px] w-full rounded-[16px] border border-[#e4dcf8] px-4 text-[13px] outline-none focus:border-[#6d5bd0]"
                    />
                  </div>

                  {confirmedAddressError ? (
                    <div className="mt-3 rounded-[14px] border border-[#fecdd3] bg-[#fff1f2] px-4 py-3 text-[12px] text-[#be123c]">
                      {confirmedAddressError}
                    </div>
                  ) : null}
                  {confirmedAddressSuccess ? (
                    <div className="mt-3 rounded-[14px] border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-[12px] text-[#15803d]">
                      {confirmedAddressSuccess}
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleSaveConfirmedAddress}
                    disabled={confirmedAddressSaving}
                    className="mt-4 flex h-[46px] w-full items-center justify-center rounded-[16px] bg-[#6d5bd0] text-[13px] font-semibold text-white disabled:opacity-60"
                  >
                    {confirmedAddressSaving ? "Saving..." : "Save address details"}
                  </button>
                </div>
              </div>
            ) : null}

            {/* Sticky footer CTA */}
            <div className="shrink-0 grid grid-cols-2 gap-3 border-t border-[#efe9ff] bg-white/95 px-4 pb-[env(safe-area-inset-bottom,12px)] pt-3 backdrop-blur">
              <button
                type="button"
                onClick={() => {
                  if (!hasConfirmedAddressMinimum) return;
                  closeSlotsModal();
                }}
                disabled={!hasConfirmedAddressMinimum}
                className="h-[52px] rounded-[16px] border border-[#d9dbe7] bg-white text-[15px] font-semibold text-[#2a2745] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Back to home
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!hasConfirmedAddressMinimum) return;
                  closeSlotsModal();
                  openTrackBookingModal();
                }}
                disabled={!hasConfirmedAddressMinimum}
                className="h-[52px] rounded-[16px] bg-[#6d5bd0] text-[15px] font-semibold text-white shadow-[0_12px_24px_rgba(109,91,208,0.22)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                My bookings
              </button>
            </div>
          </div>
        ) : null}

        {/* Step 1: Setup */}
        {!confirmedBooking && mobileBookingStep === "setup" ? (
          <div className="px-4 pt-5 pb-32">
            <h2 className="text-[26px] font-black tracking-[-0.04em] text-[#1f1f2c]">Book a session</h2>
            <p className="mt-2 text-[14px] leading-[1.7] text-[#6b7280]">Select your package, city, and preferred date.</p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8f85c7]">Package / Plan</label>
                <select
                  name="service"
                  value={heroForm.service}
                  onChange={handleHeroInputChange}
                  className="h-[54px] w-full rounded-[18px] border border-[#d9dbe7] bg-white px-4 text-[16px] font-medium text-[#25233a] outline-none focus:border-[#7c68e5]"
                >
                  <optgroup label="Individual Sessions">
                    {SERVICE_OPTIONS.filter((s) => s.category === "Individual Sessions").sort((a, b) => a.order - b.order).map((s) => (
                      <option key={s.name} value={s.name}>{getServiceLabel(s.name)}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Coat Care Plans">
                    {SERVICE_OPTIONS.filter((s) => s.category === "Coat Care Plans").sort((a, b) => a.order - b.order).map((s) => (
                      <option key={s.name} value={s.name}>{getServiceLabel(s.name)}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8f85c7]">City</label>
                <select
                  name="city"
                  value={heroForm.city}
                  onChange={handleHeroInputChange}
                  className="h-[54px] w-full rounded-[18px] border border-[#d9dbe7] bg-white px-4 text-[16px] font-medium text-[#25233a] outline-none focus:border-[#7c68e5]"
                >
                  <option value="" disabled>Select your city</option>
                  {SUPPORTED_CITIES.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <label
                  htmlFor="mobile-booking-date-input"
                  className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8f85c7]"
                >
                  Visit Date
                </label>

                <div className="relative">
                  <div className="pointer-events-none flex h-[58px] w-full items-center justify-between rounded-[20px] border border-[#d9d2f3] bg-white px-5 text-left shadow-[0_8px_24px_rgba(109,91,208,0.06)]">
                    <div className="min-w-0">
                      <div className="text-[11px] font-[700] uppercase tracking-[0.18em] text-[#9a8fc8]">
                        Select date
                      </div>
                      <div
                        className={`mt-1 truncate text-[17px] font-[600] leading-none ${
                          selectedDateLabel ? "text-[#2c234d]" : "text-[#9aa1b2]"
                        }`}
                      >
                        {selectedDateLabel || "Choose your visit date"}
                      </div>
                    </div>

                    <div className="ml-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#ebe5fb] bg-[#faf8ff]">
                      <CalendarDays className="h-5 w-5 text-[#6d5bd0]" />
                    </div>
                  </div>

                  <input
                    id="mobile-booking-date-input"
                    name="requiredDate"
                    type="date"
                    value={heroForm.requiredDate}
                    onChange={handleHeroInputChange}
                    className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                    aria-label="Select visit date"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 h-px w-full bg-[#eee7fb]" />

            {slotsError ? <p className="mt-4 text-[13px] text-red-500">{slotsError}</p> : null}

            <p className="mt-4 text-[13px] leading-[1.6] text-[#9096ac]">
  Choose a date to view available booking windows.
</p>

            <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#ece6fb] bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 backdrop-blur">
              <button
                type="button"
                onClick={() => handleCheckAvailability(true)}
                disabled={slotsLoading || !heroForm.service || !heroForm.city || !heroForm.requiredDate}
                className="h-[54px] w-full rounded-[18px] bg-[#6d5bd0] text-[16px] font-semibold text-white shadow-[0_12px_28px_rgba(109,91,208,0.22)] disabled:opacity-50"
              >
                {slotsLoading ? "Checking..." : "Check availability"}
              </button>
            </div>
          </div>
        ) : null}

        {/* Step 2: Slot Selection */}
        {!confirmedBooking && mobileBookingStep === "slot" ? (
          <div className="px-4 pb-32 pt-5">
            <h2 className="text-[26px] font-black tracking-[-0.04em] text-[#1f1f2c]">Choose a slot</h2>
            <p className="mt-2 text-[14px] font-medium text-[#6b7280]">{heroForm.service} · {heroForm.city}</p>

            {/* Date rail */}
            <div className="-mx-1 mt-5 overflow-x-auto pb-2">
              <div className="flex w-max gap-3 px-1">
                {availabilityDates.map((dateItem) => {
                  const isSelected = selectedDate === dateItem.date;
                  const hasAvailability = dateItem.totalBookingWindows > 0;
                  return (
                    <button
                      key={dateItem.date}
                      type="button"
                      onClick={() => handleSelectDate(dateItem.date)}
                      className={`min-w-[124px] shrink-0 rounded-[20px] border px-4 py-3.5 text-left transition ${isSelected ? "border-[#6d5bd0] bg-[#f6f3ff] shadow-[0_6px_18px_rgba(109,91,208,0.08)]" : hasAvailability ? "border-[#e0dbf0] bg-white" : "border-[#efeaf7] bg-[#f8f6fc] opacity-55"}`}
                    >
                      <div className="text-[13px] font-semibold text-[#2a2346]">
                        {new Date(`${dateItem.date}T00:00:00`).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}
                      </div>
                      <div className="mt-1 text-[12px] text-[#8a90a6]">
                        {hasAvailability ? `${dateItem.totalBookingWindows} windows` : "No slots"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Slot cards */}
            <div className="mt-5 space-y-4">
              {bookingWindows.length > 0 ? bookingWindows.map((window) => {
                const isSelected = selectedBookingWindowId === window.bookingWindowId;
                return (
                  <button
  key={window.bookingWindowId}
  type="button"
  onClick={() => setSelectedBookingWindowId(window.bookingWindowId)}
  className={`w-full rounded-[24px] border px-5 py-4.5 text-left transition ${
    isSelected
      ? "border-[#6d5bd0] bg-[#faf7ff] shadow-[0_12px_28px_rgba(109,91,208,0.11)]"
      : "border-[#dfe2ee] bg-white"
  }`}
>
  <div className="flex items-center justify-between gap-4">
    <div className="min-w-0">
      <div className="text-[28px] font-black tracking-[-0.03em] leading-none text-[#25233a]">
        {window.displayLabel}
      </div>

      <div className="mt-2 text-[14px] font-medium leading-[1.5] text-[#7a8196]">
        2-hour booking window
      </div>
    </div>

    <span
      className={`inline-flex h-[38px] shrink-0 items-center rounded-full px-4 text-[13px] font-semibold ${
        isSelected
          ? "bg-[#6d5bd0] text-white"
          : "bg-[#f3efff] text-[#6c7286]"
      }`}
    >
      {isSelected ? "Selected" : "Select"}
    </span>
  </div>
</button>
                );
              }) : (
                <div className="rounded-[24px] border border-[#ebe7f4] bg-[#faf9fc] p-6">
                  <div className="text-[16px] font-semibold text-[#2a2346]">No booking windows available for this date.</div>
                  <p className="mt-2 text-[14px] text-[#8a90a6]">Try another date above.</p>
                </div>
              )}
            </div>

            <p className="mt-4 text-[12px] leading-[1.6] text-[#9096ac]">
  Our team will arrive within your selected booking window.
</p>

            <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#ece6fb] bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 backdrop-blur">
              <button
                type="button"
                onClick={() => { if (selectedBookingWindowId) setMobileBookingStep("details"); }}
                disabled={!selectedBookingWindowId}
                className="h-[54px] w-full rounded-[18px] bg-[#6d5bd0] text-[16px] font-semibold text-white shadow-[0_12px_28px_rgba(109,91,208,0.22)] disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          </div>
        ) : null}

        {/* Step 3: Details */}
        {!confirmedBooking && mobileBookingStep === "details" ? (
          <div className="px-4 pb-32 pt-5">
            <h2 className="text-[26px] font-black tracking-[-0.04em] text-[#1f1f2c]">Your details</h2>
            <p className="mt-2 text-[14px] leading-[1.7] text-[#6b7280]">Name, phone number, and number of pets.</p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8f85c7]">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={heroForm.name}
                  onChange={handleHeroInputChange}
                  placeholder="Enter your full name"
                  className="h-[54px] w-full rounded-[18px] border border-[#d9dbe7] bg-white px-4 text-[16px] font-medium text-[#25233a] outline-none placeholder:text-[#9096ac] focus:border-[#7c68e5]"
                />
              </div>
              <div>
                <label className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8f85c7]">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={heroForm.phone}
                  onChange={handleHeroInputChange}
                  onBlur={handlePhoneBlurLookup}
                  placeholder="Enter your mobile number"
                  className="h-[54px] w-full rounded-[18px] border border-[#d9dbe7] bg-white px-4 text-[16px] font-medium text-[#25233a] outline-none placeholder:text-[#9096ac] focus:border-[#7c68e5]"
                />
              </div>
            </div>

            <div className="mt-6">
              <div className="text-[16px] font-bold text-[#2a2745]">How many pets?</div>
              <div className="mt-3 flex gap-3">
                {[1, 2, 3, 4].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => handlePetCountChange(count)}
                    className={`flex h-[52px] w-[52px] items-center justify-center rounded-full text-[20px] font-semibold transition ${petCount === count ? "bg-[#6d5bd0] text-white" : "border border-[#d9dbe7] bg-white text-[#585f75]"}`}
                  >
                    {count}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[13px] text-[#9096ac]">You can add each pet&apos;s details on the next step.</p>
            </div>

            {bookingCreateError ? <p className="mt-4 text-[13px] text-red-500">{bookingCreateError}</p> : null}

            <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#ece6fb] bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 backdrop-blur">
              <button
                type="button"
                onClick={async () => {
                  if (!selectedBookingWindowId) {
                    setBookingCreateError("Please select a booking window first.");
                    setMobileBookingStep("slot");
                    return;
                  }

                  if (!heroForm.name.trim() || !heroForm.phone.trim()) {
                    setBookingCreateError("Please fill your name and phone.");
                    return;
                  }
                  setBookingCreateError("");
                  await fetchSavedPetsByPhone(heroForm.phone);
                  await fetchLoyaltyStatus(heroForm.phone);
                  setMobileBookingStep("pets");
                }}
                disabled={!heroForm.name.trim() || !heroForm.phone.trim()}
                className="h-[54px] w-full rounded-[18px] bg-[#6d5bd0] text-[16px] font-semibold text-white shadow-[0_12px_28px_rgba(109,91,208,0.22)] disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        ) : null}

        {/* Step 4: Pets */}
        {!confirmedBooking && mobileBookingStep === "pets" ? (
          <div className="px-4 pb-32 pt-5">
            <h2 className="text-[26px] font-black tracking-[-0.04em] text-[#1f1f2c]">Pet details</h2>
            <p className="mt-2 text-[14px] leading-[1.6] text-[#6b7280]">
              Select a saved companion or enter details below.
            </p>

            <div className="mt-6">
<div className="mb-3 flex items-center justify-between">
  <div className="text-[13px] font-semibold text-[#2a2346]">
    Saved companions
  </div>

  <button
    type="button"
    onClick={() => {
      loadCompanions(heroForm.phone || trackPhone);
      setIsSavedCompanionsOpen(true);
    }}
    className="inline-flex items-center gap-2 rounded-full border border-[#ddd1fb] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#6d5bd0]"
  >
    Manage
  </button>
</div>
              {/* Saved companions selector */}
              {savedPetsLoading ? (
                <div className="mb-4 rounded-[20px] border border-[#ece5ff] bg-[#fbf9ff] px-4 py-3">
                  <div className="text-[12px] text-[#9aa1b2]">Loading…</div>
                </div>
              ) : savedPets.length > 0 ? (
                <div className="mb-4 rounded-[20px] border border-[#ece5ff] bg-[#fbf9ff] p-4">
                  <div className="flex items-baseline gap-2">
                    <div className="text-[13px] font-bold text-[#2a2346]">Saved companions</div>
                    <span className="text-[11px] text-[#9aa1b2]">Tap to select</span>
                  </div>

                  <div className="-mx-1 mt-3 overflow-x-auto pb-1">
                    <div className="flex w-max gap-2 px-1">
                      {savedPets.map((savedPet) => {
                        const isSelected = selectedSavedPetIds.includes(savedPet.petId);
                        const avatarUrl = getSavedPetAvatar(savedPet);
                        return (
                          <button
                            key={savedPet.petId}
                            type="button"
                            onClick={() => handleToggleSavedPet(savedPet)}
                            className={`relative w-[110px] rounded-[16px] border p-3 text-center transition ${isSelected ? "border-[#6d5bd0] bg-[#faf8ff] shadow-[0_6px_16px_rgba(109,91,208,0.10)]" : "border-[#e8e2f5] bg-white"}`}
                          >
                            {isSelected ? (
                              <div className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#6d5bd0] text-[9px] text-white">✓</div>
                            ) : null}
                            <div className="relative mx-auto h-10 w-10 overflow-hidden rounded-full border border-[#ece5ff] bg-[#f7f3ff]">
                              {avatarUrl ? (
                                <Image
                                  src={avatarUrl}
                                  alt={savedPet.name || savedPet.breed}
                                  fill
                                  sizes="40px"
                                  unoptimized
                                  className="object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[16px]">
                                  {savedPet.species === "cat" ? "🐱" : "🐶"}
                                </div>
                              )}
                            </div>
                            <div className="mt-2 truncate text-[12px] font-semibold text-[#2a2346]">{savedPet.name || "Pet"}</div>
                            <div className="truncate text-[11px] text-[#9aa1b2]">{savedPet.breed}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {savedPetsError ? <p className="mt-2 text-[11px] text-red-500">{savedPetsError}</p> : null}
                </div>
              ) : null}

              <div className="space-y-4">
              {pets.map((pet, index) => (
                <div key={index} className="rounded-[26px] border border-[#e9e0fb] bg-white p-5">
                  <div className="text-[17px] font-bold text-[#2a2346]">Pet {index + 1}</div>
                  <div className="mt-4 space-y-3">
                    <input
                      type="text"
                      value={pet.name}
                      onChange={(e) => handlePetFieldChange(index, "name", e.target.value)}
                      placeholder="Pet name (optional)"
                      className="h-[50px] w-full rounded-[16px] border border-[#d9dbe7] bg-[#fcfcff] px-4 text-[15px] outline-none focus:border-[#7c68e5]"
                    />
                    <div className="relative">
                      <input
                        type="text"
                        value={pet.breed}
                        onChange={(e) => handlePetBreedInputChange(index, e.target.value)}
                        onFocus={() => setActiveBreedIndex(index)}
                        onBlur={() => handlePetBreedBlur(index)}
                        placeholder="Pet breed (required)"
                        className="h-[50px] w-full rounded-[16px] border border-[#d9dbe7] bg-[#fcfcff] px-4 text-[15px] outline-none focus:border-[#7c68e5]"
                      />
                      {activeBreedIndex === index && getBreedSuggestions(pet.breed).length > 0 ? (
                        <div className="absolute left-0 right-0 top-[58px] z-20 overflow-hidden rounded-[18px] border border-[#ece5ff] bg-white shadow-[0_16px_36px_rgba(73,44,120,0.12)]">
                          {getBreedSuggestions(pet.breed).map((breed) => (
                            <button key={breed} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => handleSelectBreedSuggestion(index, breed)} className="flex w-full items-center justify-between px-5 py-3.5 text-left text-[15px] text-[#2a2346] hover:bg-[#faf8ff]">
                              <span>{breed}</span>
                              <span className="text-[13px] text-[#8a90a6]">Select</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="pt-1 space-y-3">
  {heroForm.service === "Complete Pampering" ? (
    <div className="rounded-[20px] border border-[#ece5ff] bg-[#fcfbff] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[14px] font-semibold text-[#2a2346]">Haircut preferences</div>
        <span className="shrink-0 rounded-full border border-[#ede5da] bg-[#fdf8f4] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#b07848]">
          Premium
        </span>
      </div>
      <p className="mt-1 text-[12px] text-[#9aa1b2]">Share your preferred look or reference photos.</p>

      <div className="mt-3 flex items-start gap-2 rounded-[12px] bg-[#fffaf6] px-3 py-2.5">
        <span className="mt-0.5 shrink-0 text-[13px]">💬</span>
        <p className="text-[11px] leading-[1.55] text-[#9b7a60]">
          We may share a suggested haircut direction on WhatsApp before the session.
        </p>
      </div>

      <textarea
        value={pet.stylingNotes}
onChange={(e) => handlePetStylingNotesChange(index, e.target.value)}
        placeholder="Example: Keep the face round, trim paws neatly, avoid a very short cut."
        rows={3}
        className="mt-3 w-full rounded-[14px] border border-[#d9dbe7] bg-white px-4 py-3 text-[14px] leading-[1.65] text-[#25233a] outline-none placeholder:text-[#9aa1b2] focus:border-[#7c68e5]"
      />

      <div className="mt-3">
        <label className="flex cursor-pointer items-center gap-2 rounded-[14px] border border-dashed border-[#ddd1fb] bg-white px-4 py-2.5 text-[13px] font-medium text-[#6d5bd0] transition hover:bg-[#faf8ff]">
          <span>📷</span>
          <span>Upload reference photos</span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handlePetStylingImagesChange(index, e)}
            className="hidden"
          />
        </label>
        <p className="mt-1.5 text-[11px] text-[#b8bcc8]">Optional, recommended for haircut planning.</p>
      </div>

      {pet.stylingImages.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {pet.stylingImages.map((image, imageIndex) => (
            <div
              key={`${image.name}-${imageIndex}`}
              className="relative overflow-hidden rounded-[16px] border border-[#e7defa] bg-white"
            >
              <Image
                src={URL.createObjectURL(image)}
                alt={image.name}
                width={220}
                height={110}
                unoptimized
                className="h-[110px] w-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemovePetStylingImage(index, imageIndex)}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(17,12,33,0.72)] text-[12px] font-semibold text-white"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  ) : null}

  <div className="rounded-[16px] border border-[#ece5ff] bg-white">
    <button
      type="button"
      onClick={() => togglePetNotesPanel(index)}
      className="flex w-full items-center justify-between px-4 py-3 text-left"
    >
      <div>
        <div className="text-[14px] font-semibold text-[#2a2346]">
          Add grooming notes
        </div>
        <div className="mt-1 text-[12px] text-[#9aa1b2]">
          Optional
        </div>
      </div>

      <span className="text-[18px] leading-none text-[#8f85c7]">
        {expandedPetNotes.includes(index) ? "−" : "+"}
      </span>
    </button>

    {expandedPetNotes.includes(index) ? (
      <div className="border-t border-[#f1ebff] px-4 pb-4 pt-3">
        <textarea
          value={pet.groomingNotes || ""}
          onChange={(e) =>
            handlePetGroomingNotesChange(index, e.target.value)
          }
          placeholder="Sensitive areas, matting, skin concern, or handling notes."
          rows={3}
          className="w-full rounded-[14px] border border-[#d9dbe7] bg-[#fcfcff] px-4 py-3 text-[14px] leading-[1.65] text-[#25233a] outline-none placeholder:text-[#9aa1b2] focus:border-[#7c68e5]"
        />

        <div className="mt-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#ddd1fb] bg-white px-4 py-2 text-[13px] font-medium text-[#6d5bd0] transition hover:bg-[#faf8ff]">
            <span>📷</span>
            <span>Upload concern photo</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handlePetConcernImagesChange(index, e)}
              className="hidden"
            />
          </label>
          <p className="mt-1.5 text-[11px] text-[#b8bcc8]">Optional.</p>
        </div>

        {pet.concernImages?.length ? (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {pet.concernImages.map((image, imageIndex) => (
              <div
                key={`${image.name}-${imageIndex}`}
                className="relative overflow-hidden rounded-[14px] border border-[#e7defa] bg-white"
              >
                <Image
                  src={URL.createObjectURL(image)}
                  alt={image.name}
                  width={192}
                  height={96}
                  unoptimized
                  className="h-[96px] w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemovePetConcernImage(index, imageIndex)}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(17,12,33,0.72)] text-[12px] font-semibold text-white"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    ) : null}
  </div>
</div>
                  </div>
                </div>
              ))}
            </div>
            </div>

            {bookingCreateError ? <p className="mt-4 text-[13px] text-red-500">{bookingCreateError}</p> : null}

            <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#ece6fb] bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 backdrop-blur">
              <button
                type="button"
                onClick={() => {
                  if (!selectedBookingWindowId) {
                    setBookingCreateError("Please select a booking window first.");
                    setMobileBookingStep("slot");
                    return;
                  }

                  if (!pets.every((p) => p.breed.trim())) {
                    setBookingCreateError("Please enter the breed for each pet.");
                    return;
                  }
                  setBookingCreateError("");
                  setMobileBookingStep("payment");
                  updatePricingPreview(couponCode);
                }}
                disabled={!pets.every((p) => p.breed.trim())}
                className="h-[54px] w-full rounded-[18px] bg-[#6d5bd0] text-[16px] font-semibold text-white shadow-[0_12px_28px_rgba(109,91,208,0.22)] disabled:opacity-50"
              >
                Review booking
              </button>
            </div>
          </div>
        ) : null}

        {/* Step 5: Payment */}
        {!confirmedBooking && mobileBookingStep === "payment" ? (
          <div className="px-4 pb-36 pt-5">
            <h2 className="text-[26px] font-black tracking-[-0.04em] text-[#1f1f2c]">Payment</h2>
            <p className="mt-2 text-[14px] leading-[1.7] text-[#6b7280]">Choose how you&apos;d like to pay.</p>

            <div className="mt-6 space-y-4">
              <button
                type="button"
                onClick={() => handlePaymentMethodChange("pay_now")}
                className={`w-full rounded-[24px] border p-6 text-left transition ${paymentMethod === "pay_now" ? "border-[#6d5bd0] bg-[#faf7ff] shadow-[0_8px_24px_rgba(109,91,208,0.10)]" : "border-[#d9dbe7] bg-white"}`}
              >
                <div className="text-[22px] font-black tracking-[-0.03em] text-[#2a2346]">Pay Now</div>
                <p className="mt-2 text-[15px] leading-[1.6] text-[#6b7285]">Reserve instantly and unlock coupon savings.</p>
              </button>
              <button
                type="button"
                onClick={() => handlePaymentMethodChange("pay_after_service")}
                className={`w-full rounded-[24px] border p-6 text-left transition ${paymentMethod === "pay_after_service" ? "border-[#6d5bd0] bg-[#faf7ff] shadow-[0_8px_24px_rgba(109,91,208,0.10)]" : "border-[#d9dbe7] bg-white"}`}
              >
                <div className="text-[22px] font-black tracking-[-0.03em] text-[#2a2346]">Pay After Service</div>
                <p className="mt-2 text-[15px] leading-[1.6] text-[#6b7285]">Confirm now and pay once the grooming session is completed.</p>
              </button>
            </div>

            {paymentMethod === "pay_now" ? (
              <div className="mt-5 rounded-[24px] border border-[#e9e0fb] bg-[#fbf9ff] p-5">
                <div className="text-[16px] font-bold text-[#2a2745]">Coupon</div>
                <div className="mt-3">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => { const v = e.target.value.toUpperCase(); setCouponCode(v); updatePricingPreview(v); }}
                    placeholder="Enter coupon code"
                    className="h-[50px] w-full rounded-[16px] border border-[#d9dbe7] bg-white px-4 text-[15px] uppercase outline-none focus:border-[#7c68e5]"
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2.5">
                  {availableCoupons.map((coupon) => {
                    const isApplied = couponCode.trim().toUpperCase() === coupon.code;
                    return (
                      <button key={coupon.code} type="button" onClick={() => applyCouponCode(coupon.code)} className={`rounded-[14px] border px-4 py-2.5 text-[13px] font-semibold transition ${isApplied ? "border-[#6d5bd0] bg-[#f6f3ff] text-[#6d5bd0]" : "border-[#ddd1fb] bg-white text-[#4f477f]"}`}>
                        {coupon.code} · {coupon.label}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-[13px] text-[#9096ac]">Coupons apply only on prepaid bookings.</p>
              </div>
            ) : null}

            <div className="mt-5 rounded-[24px] border border-[#e9e0fb] bg-white p-5">
              <div className="flex items-center justify-between text-[15px] text-[#6b7285]">
                <span>Original</span>
                <span>₹{pricingPreview.originalAmount}</span>
              </div>
              {pricingPreview.finalAmount < pricingPreview.originalAmount ? (
                <div className="mt-3 flex items-center justify-between text-[15px] text-[#119b73]">
                  <span>Discount</span>
                  <span>-₹{pricingPreview.originalAmount - pricingPreview.finalAmount}</span>
                </div>
              ) : null}
              <div className="my-4 h-px bg-[#ece6fb]" />
              <div className="flex items-end justify-between">
                <span className="text-[18px] font-bold text-[#2a2745]">Total</span>
                <span className="text-[26px] font-black tracking-[-0.03em] text-[#25233a]">₹{pricingPreview.finalAmount}</span>
              </div>
            </div>

            {/* Loyalty strip */}
            <div className="mt-4">
              {loyaltyStatusLoading ? (
                <div className="rounded-[22px] border border-[#ece5ff] bg-[linear-gradient(180deg,#ffffff_0%,#fcfbff_100%)] p-4 text-[13px] text-[#8a90a6] sm:p-5">
                  Loading loyalty status...
                </div>
              ) : (
                renderLoyaltySummaryCard(loyaltyStatus, "booking_flow")
              )}
            </div>

            {bookingCreateError ? <p className="mt-4 text-[13px] text-red-500">{bookingCreateError}</p> : null}

            <div className="fixed inset-x-0 bottom-0 z-20 space-y-2 border-t border-[#ece6fb] bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 backdrop-blur">
              <button
                type="button"
                onClick={handleCreateBooking}
                disabled={bookingCreateLoading || !paymentMethod}
                className="h-[54px] w-full rounded-[18px] bg-[#6d5bd0] text-[16px] font-semibold text-white shadow-[0_12px_28px_rgba(109,91,208,0.22)] disabled:opacity-50"
              >
                {bookingCreateLoading ? "Creating booking..." : paymentMethod === "pay_now" ? "Continue to payment" : "Confirm booking"}
              </button>
              <p className="text-center text-[13px] text-[#9096ac]">
                {paymentMethod === "pay_now" ? "Secure checkout opens on the next step." : paymentMethod === "pay_after_service" ? "No online payment is required right now." : ""}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* ── DESKTOP FLOW ── */}
      <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:overflow-hidden">

        {/* ── Desktop Header ── */}
        {!confirmedBooking && (
          <header className="shrink-0 border-b border-[#ece6fb] px-10 py-7">
            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="inline-flex items-center rounded-full border border-[#ddd1fb] px-5 py-2 text-[12px] font-semibold uppercase tracking-[0.22em] text-[#6f5add]">
                  Booking Details
                </div>
                <h2 className="mt-4 text-[46px] font-black leading-[0.95] tracking-[-0.04em] text-[#25233a]">
                  Complete your booking
                </h2>
                <p className="mt-3 max-w-[680px] text-[17px] leading-[1.75] text-[#6b7285]">
                  Fill in your details, choose a preferred date, check slot availability, and complete your booking for the selected package.
                </p>
              </div>
              <button
                type="button"
                onClick={closeSlotsModal}
                className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#e3dcf7] bg-white text-[#2a2745] transition hover:bg-[#faf8ff]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>
        )}

        {/* ── Desktop Main (scrollable) ── */}
        <main className="flex-1 overflow-y-auto px-10 py-8">

        {/* ── DESKTOP CONFIRMATION ── */}
        {confirmedBooking ? (
          <div className="mx-auto max-w-[760px] py-4">
            {isAddressCaptureRequired ? (
              <div className="mb-6 rounded-[30px] border border-[#d9d2f3] bg-white p-6 shadow-[0_18px_44px_rgba(109,91,208,0.08)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#6d5bd0]">
                      Save service address
                    </div>
                    <p className="mt-2 max-w-[560px] text-[14px] leading-[1.8] text-[#6b7285]">
                      Save your full visit address first. The booking confirmation below will unlock right after this.
                    </p>
                  </div>
                  <div className="shrink-0 rounded-full bg-[#f4efff] px-4 py-2 text-[12px] font-semibold text-[#6d5bd0]">
                    Address required
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <textarea
                    value={confirmedAddressDraft.serviceAddress}
                    onChange={(event) =>
                      setConfirmedAddressDraft((prev) => ({ ...prev, serviceAddress: event.target.value }))
                    }
                    placeholder="Full address"
                    rows={4}
                    className="min-h-[120px] rounded-[20px] border border-[#e4dcf8] px-4 py-3 text-[14px] outline-none focus:border-[#6d5bd0] md:col-span-2"
                  />
                  <input
                    type="text"
                    value={confirmedAddressDraft.serviceLandmark}
                    onChange={(event) =>
                      setConfirmedAddressDraft((prev) => ({ ...prev, serviceLandmark: event.target.value }))
                    }
                    placeholder="Nearby landmark"
                    className="h-[52px] rounded-[18px] border border-[#e4dcf8] px-4 text-[14px] outline-none focus:border-[#6d5bd0]"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={confirmedAddressDraft.servicePincode}
                    onChange={(event) =>
                      setConfirmedAddressDraft((prev) => ({ ...prev, servicePincode: event.target.value }))
                    }
                    placeholder="Pin code"
                    className="h-[52px] rounded-[18px] border border-[#e4dcf8] px-4 text-[14px] outline-none focus:border-[#6d5bd0]"
                  />
                  <input
                    type="url"
                    value={confirmedAddressDraft.serviceLocationUrl}
                    onChange={(event) =>
                      setConfirmedAddressDraft((prev) => ({ ...prev, serviceLocationUrl: event.target.value }))
                    }
                    placeholder="Google Maps link (optional)"
                    className="h-[52px] rounded-[18px] border border-[#e4dcf8] px-4 text-[14px] outline-none focus:border-[#6d5bd0] md:col-span-2"
                  />
                </div>

                {confirmedAddressError ? (
                  <div className="mt-4 rounded-[18px] border border-[#fecdd3] bg-[#fff1f2] px-4 py-3 text-[13px] text-[#be123c]">
                    {confirmedAddressError}
                  </div>
                ) : null}
                {confirmedAddressSuccess ? (
                  <div className="mt-4 rounded-[18px] border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-[13px] text-[#15803d]">
                    {confirmedAddressSuccess}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={handleSaveConfirmedAddress}
                  disabled={confirmedAddressSaving}
                  className="mt-5 inline-flex h-[52px] items-center justify-center rounded-[18px] bg-[#6d5bd0] px-8 text-[15px] font-semibold text-white shadow-[0_14px_30px_rgba(109,91,208,0.20)] disabled:opacity-60"
                >
                  {confirmedAddressSaving ? "Saving..." : "Save address details"}
                </button>
              </div>
            ) : null}

            <div className={isAddressCaptureRequired ? "pointer-events-none select-none opacity-45 blur-[2px]" : ""}>
            <div className="flex items-start justify-between">
              <div />
              <button
                type="button"
                onClick={() => {
                  if (!hasConfirmedAddressMinimum) return;
                  closeSlotsModal();
                }}
                disabled={!hasConfirmedAddressMinimum}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-[#e3dcf7] bg-white text-[#2a2745] transition hover:bg-[#faf8ff] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex justify-center">
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[#eefcf4]">
                <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#18a34a] text-[36px] text-white">✓</div>
              </div>
            </div>

            <div className="mt-7 flex justify-center">
              <div className="inline-flex items-center rounded-full border border-[#bfe6cb] bg-[#f2fcf5] px-5 py-2 text-[12px] font-semibold uppercase tracking-[0.22em] text-[#11804d]">
                Booking Confirmed
              </div>
            </div>

            <div className="mt-5 text-center">
              <h3 className="text-[38px] font-black leading-[1.04] tracking-[-0.04em] text-[#1f1f2c]">Your session is successfully reserved</h3>
              <p className="mx-auto mt-4 max-w-[560px] text-[16px] leading-[1.85] text-[#6b7285]">
                Your booking has been secured. Our pet care team will contact you shortly with the final visit coordination details.
              </p>
            </div>

            <div className="mt-8 rounded-[30px] border border-[#e9e0fb] bg-[#fbf9ff] p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#6d5bd0]">Booking ID</div>
                  <div className="mt-2 break-all text-[18px] font-black text-[#2a2346]">{confirmedBooking.bookingId}</div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(confirmedBooking.bookingId);
                      setBookingIdCopied(true);
                      setTimeout(() => setBookingIdCopied(false), 2000);
                    }}
                    className="rounded-full border border-[#ddd1fb] bg-white px-4 py-2 text-[13px] font-semibold text-[#6d5bd0]"
                  >
                    {bookingIdCopied ? "Copied!" : "Copy ID"}
                  </button>
                  <div className="rounded-full bg-[#f6fff8] px-4 py-2 text-[13px] font-semibold text-[#11795d]">
                    {confirmedBooking.paymentMethod === "pay_now" ? "Pay Now" : "Pay After Service"}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                {[
                  ["SERVICE", confirmedBooking.serviceName],
                  ["CITY", confirmedBooking.city],
                  ["DATE", confirmedBooking.selectedDate],
                  ["BOOKING WINDOW", confirmedBooking.bookingWindowLabel],
                  ["PETS", `${confirmedBooking.petCount} pet${confirmedBooking.petCount > 1 ? "s" : ""}`],
                  ["AMOUNT", `₹${confirmedBooking.finalAmount}`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[22px] border border-[#e9e0fb] bg-white p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8b90a0]">{label}</div>
                    <div className="mt-2 text-[16px] font-bold text-[#2a2346]">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`mt-6 rounded-[30px] border border-[#e9e0fb] bg-white p-6 ${isAddressCaptureRequired ? "hidden" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#6d5bd0]">
                    Save service address
                  </div>
                  <p className="mt-2 max-w-[560px] text-[14px] leading-[1.8] text-[#6b7285]">
                    Please save the complete visit address here before leaving this booking confirmation screen.
                  </p>
                </div>
                <div
                  className={`shrink-0 rounded-full px-4 py-2 text-[12px] font-semibold ${
                    confirmedBooking.addressStatus === "complete"
                      ? "bg-[#eefcf4] text-[#11804d]"
                      : confirmedBooking.addressStatus === "partial"
                        ? "bg-[#fff7ed] text-[#c2410c]"
                        : "bg-[#f4efff] text-[#6d5bd0]"
                  }`}
                >
                  {confirmedBooking.addressStatus === "complete"
                    ? "Address saved"
                    : confirmedBooking.addressStatus === "partial"
                      ? "Maps link optional"
                      : "Address required"}
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <textarea
                  value={confirmedAddressDraft.serviceAddress}
                  onChange={(event) =>
                    setConfirmedAddressDraft((prev) => ({ ...prev, serviceAddress: event.target.value }))
                  }
                  placeholder="Full address"
                  rows={4}
                  className="min-h-[120px] rounded-[20px] border border-[#e4dcf8] px-4 py-3 text-[14px] outline-none focus:border-[#6d5bd0] md:col-span-2"
                />
                <input
                  type="text"
                  value={confirmedAddressDraft.serviceLandmark}
                  onChange={(event) =>
                    setConfirmedAddressDraft((prev) => ({ ...prev, serviceLandmark: event.target.value }))
                  }
                  placeholder="Nearby landmark"
                  className="h-[52px] rounded-[18px] border border-[#e4dcf8] px-4 text-[14px] outline-none focus:border-[#6d5bd0]"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  value={confirmedAddressDraft.servicePincode}
                  onChange={(event) =>
                    setConfirmedAddressDraft((prev) => ({ ...prev, servicePincode: event.target.value }))
                  }
                  placeholder="Pin code"
                  className="h-[52px] rounded-[18px] border border-[#e4dcf8] px-4 text-[14px] outline-none focus:border-[#6d5bd0]"
                />
                <input
                  type="url"
                  value={confirmedAddressDraft.serviceLocationUrl}
                  onChange={(event) =>
                    setConfirmedAddressDraft((prev) => ({ ...prev, serviceLocationUrl: event.target.value }))
                  }
                  placeholder="Google Maps link (optional)"
                  className="h-[52px] rounded-[18px] border border-[#e4dcf8] px-4 text-[14px] outline-none focus:border-[#6d5bd0] md:col-span-2"
                />
              </div>

              {confirmedAddressError ? (
                <div className="mt-4 rounded-[18px] border border-[#fecdd3] bg-[#fff1f2] px-4 py-3 text-[13px] text-[#be123c]">
                  {confirmedAddressError}
                </div>
              ) : null}
              {confirmedAddressSuccess ? (
                <div className="mt-4 rounded-[18px] border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-[13px] text-[#15803d]">
                  {confirmedAddressSuccess}
                </div>
              ) : null}

              <button
                type="button"
                onClick={handleSaveConfirmedAddress}
                disabled={confirmedAddressSaving}
                className="mt-5 inline-flex h-[52px] items-center justify-center rounded-[18px] bg-[#6d5bd0] px-8 text-[15px] font-semibold text-white shadow-[0_14px_30px_rgba(109,91,208,0.20)] disabled:opacity-60"
              >
                {confirmedAddressSaving ? "Saving..." : "Save address details"}
              </button>
            </div>

            <div className="mt-7 flex justify-center gap-4">
              <button
                type="button"
                onClick={() => {
                  if (!hasConfirmedAddressMinimum) return;
                  closeSlotsModal();
                  openTrackBookingModal();
                }}
                disabled={!hasConfirmedAddressMinimum}
                className="inline-flex h-[54px] items-center justify-center rounded-[18px] border border-[#d9dbe7] bg-white px-8 text-[15px] font-semibold text-[#2a2745] transition hover:bg-[#faf9ff] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Track Booking
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!hasConfirmedAddressMinimum) return;
                  closeSlotsModal();
                }}
                disabled={!hasConfirmedAddressMinimum}
                className="inline-flex h-[54px] items-center justify-center rounded-[18px] bg-[#6d5bd0] px-8 text-[15px] font-semibold text-white shadow-[0_14px_30px_rgba(109,91,208,0.20)] transition hover:bg-[#5f4fc2] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Close
              </button>
            </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">

            {/* ── Section 1: Setup ── */}
            <section className="rounded-[28px] border border-[#e9e0fb] bg-[#fbf9ff] p-7">
              <div className="rounded-[22px] border border-[#e9e0fb] bg-white p-5">
                <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8f85c7]">Package / Plan</div>
                <div className="mt-2 text-[20px] font-bold text-[#25233a]">{getServiceLabel(heroForm.service)}</div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8f85c7]">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={heroForm.name}
                    onChange={handleHeroInputChange}
                    placeholder="Enter your full name"
                    className="h-[54px] w-full rounded-[18px] border border-[#d9dbe7] bg-white px-4 text-[16px] font-medium text-[#25233a] outline-none placeholder:text-[#9096ac] focus:border-[#7c68e5]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8f85c7]">Mobile Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={heroForm.phone}
                    onChange={handleHeroInputChange}
                    onBlur={handlePhoneBlurLookup}
                    placeholder="Enter your mobile number"
                    className="h-[54px] w-full rounded-[18px] border border-[#d9dbe7] bg-white px-4 text-[16px] font-medium text-[#25233a] outline-none placeholder:text-[#9096ac] focus:border-[#7c68e5]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8f85c7]">City</label>
                  <select
                    name="city"
                    value={heroForm.city}
                    onChange={handleHeroInputChange}
                    className="h-[54px] w-full rounded-[18px] border border-[#d9dbe7] bg-white px-4 text-[16px] font-medium text-[#25233a] outline-none focus:border-[#7c68e5]"
                  >
                    <option value="" disabled>Select city</option>
                    {SUPPORTED_CITIES.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8f85c7]">Preferred Date</label>
                  <input
                    type="date"
                    name="requiredDate"
                    value={heroForm.requiredDate}
                    onChange={handleHeroInputChange}
                    className="h-[54px] w-full rounded-[18px] border border-[#d9dbe7] bg-white px-4 text-[16px] font-medium text-[#6b7280] outline-none focus:border-[#7c68e5]"
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-4">
                <div className="min-h-[20px] flex-1">
                  {slotsError ? (
                    <p className="text-[14px] text-red-500">{slotsError}</p>
                  ) : slotsMessage ? (
                    <p className="text-[14px] text-[#5b47c8]">{slotsMessage}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => handleCheckAvailability(false)}
                  disabled={slotsLoading}
                  className="inline-flex h-[54px] shrink-0 items-center justify-center rounded-[18px] bg-[#6d5bd0] px-7 text-[15px] font-semibold text-white shadow-[0_14px_30px_rgba(109,91,208,0.20)] transition hover:bg-[#5f4fc2] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {slotsLoading ? "Checking..." : "Check availability"}
                </button>
              </div>
            </section>

            {availabilityDates.length > 0 ? (
              <>
                {/* ── Section 2: Pet count + pet details ── */}
                <section className="space-y-5">
                  <div>
                    <div className="text-[22px] font-bold text-[#25233a]">How many pets is this booking for?</div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {[1, 2, 3, 4].map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => handlePetCountChange(count)}
                          className={`inline-flex h-[48px] items-center rounded-full px-7 text-[15px] font-semibold transition ${petCount === count ? "bg-[#6d5bd0] text-white shadow-[0_12px_28px_rgba(109,91,208,0.18)]" : "border border-[#d9dbe7] bg-white text-[#595f75] hover:border-[#c8bcf5] hover:bg-[#faf8ff]"}`}
                        >
                          {count} {count === 1 ? "Pet" : "Pets"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mb-3 flex items-center justify-between">
  <div className="text-[13px] font-semibold text-[#2a2346]">
    Saved companions
  </div>

  <button
    type="button"
    onClick={() => {
      loadCompanions(heroForm.phone || trackPhone);
      setIsSavedCompanionsOpen(true);
    }}
    className="inline-flex h-[42px] items-center justify-center rounded-[14px] border border-[#ddd1fb] bg-white px-4 text-[13px] font-semibold text-[#6d5bd0]"
  >
    Manage saved companions
  </button>
</div>
                  {/* Saved companions selector — desktop */}
                  {savedPetsLoading ? (
                    <div className="mb-4 rounded-[20px] border border-[#ece5ff] bg-[#fbf9ff] px-4 py-3">
                      <div className="text-[12px] text-[#9aa1b2]">Loading saved companions…</div>
                    </div>
                  ) : savedPets.length > 0 ? (
                    <div className="mb-4 rounded-[20px] border border-[#ece5ff] bg-[#fbf9ff] p-4">
                      <div className="flex items-baseline gap-2">
                        <div className="text-[13px] font-bold text-[#2a2346]">Saved companions</div>
                        <span className="text-[11px] text-[#9aa1b2]">Click to select</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2.5">
                        {savedPets.map((savedPet) => {
                          const isSelected = selectedSavedPetIds.includes(savedPet.petId);
                          return (
                            <button
                              key={savedPet.petId}
                              type="button"
                              onClick={() => handleToggleSavedPet(savedPet)}
                              className={`flex items-center gap-2.5 rounded-[14px] border px-3.5 py-2.5 text-left transition ${isSelected ? "border-[#6d5bd0] bg-[#f0ecff]" : "border-[#ddd1fb] bg-white hover:border-[#b3a3f5]"}`}
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f0ecff] text-[13px]">
                                {savedPet.species === "cat" ? "🐱" : "🐶"}
                              </div>
                              <div className="min-w-0">
                                <div className="text-[13px] font-semibold text-[#2a2346] truncate max-w-[120px]">{savedPet.name || savedPet.breed}</div>
                                {savedPet.name ? <div className="text-[11px] text-[#8a90a6] truncate max-w-[120px]">{savedPet.breed}</div> : null}
                              </div>
                              {isSelected ? <div className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#6d5bd0] text-[10px] text-white">✓</div> : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 gap-4">
                    {pets.map((pet, index) => (
                      <div key={index} className="rounded-[26px] border border-[#e9e0fb] bg-white p-6">
                        <div className="text-[18px] font-bold text-[#25233a]">Pet {index + 1}</div>
                        <div className="mt-4 grid grid-cols-2 gap-4">
  <input
    type="text"
    value={pet.name}
    onChange={(e) => handlePetFieldChange(index, "name", e.target.value)}
    placeholder="Pet name (optional)"
    className="h-[50px] rounded-[16px] border border-[#d9dbe7] bg-[#fcfcff] px-4 text-[15px] outline-none focus:border-[#7c68e5]"
  />
  <div className="relative">
    <input
      type="text"
      value={pet.breed}
      onChange={(e) => handlePetBreedInputChange(index, e.target.value)}
      onFocus={() => setActiveBreedIndex(index)}
      onBlur={() => handlePetBreedBlur(index)}
      placeholder="Pet breed (required)"
      className="h-[50px] w-full rounded-[16px] border border-[#d9dbe7] bg-[#fcfcff] px-4 text-[15px] outline-none focus:border-[#7c68e5]"
    />
    {activeBreedIndex === index && getBreedSuggestions(pet.breed).length > 0 ? (
      <div className="absolute left-0 right-0 top-[58px] z-20 overflow-hidden rounded-[18px] border border-[#ece5ff] bg-white shadow-[0_18px_40px_rgba(73,44,120,0.12)]">
        {getBreedSuggestions(pet.breed).map((breed) => (
          <button key={breed} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => handleSelectBreedSuggestion(index, breed)} className="flex w-full items-center justify-between px-5 py-3.5 text-left text-[15px] text-[#2a2346] hover:bg-[#faf8ff]">
            <span>{breed}</span>
            <span className="text-[13px] text-[#8a90a6]">Select</span>
          </button>
        ))}
        <div className="border-t border-[#f2edff] bg-[#fcfbff] px-5 py-3 text-[12px] text-[#6b7280]">Can’t find the breed? Continue typing.</div>
      </div>
    ) : null}
  </div>
</div>

<div className="mt-4">
  <button
    type="button"
    onClick={() => togglePetNotesPanel(index)}
    className={`flex w-full items-center justify-between rounded-[18px] border px-4 py-3.5 text-left transition ${
      expandedPetNotes.includes(index)
        ? "border-[#e3dafb] bg-[#fbf9ff]"
        : "border-[#ece5ff] bg-white"
    }`}
  >
    <div className="min-w-0">
      <div className="text-[14px] font-semibold text-[#2a2346]">
        {heroForm.service === "Complete Pampering" ? "Add styling notes & photos" : "Add grooming notes"}
      </div>
      <p className="mt-1 text-[12px] leading-[1.6] text-[#8a90a6]">
        {heroForm.service === "Complete Pampering"
          ? "Optional, but helpful for hairstyle planning and coat-specific guidance."
          : "Optional, but useful for sensitive areas, matting, or handling notes."}
      </p>
    </div>

    {heroForm.service === "Complete Pampering" ? (
      <span className="ml-3 shrink-0 rounded-full border border-[#f2d8c3] bg-[#fff7f1] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#d97745]">
        Premium
      </span>
    ) : null}
  </button>

  {expandedPetNotes.includes(index) ? (
    <div className="mt-4 space-y-3">
  {heroForm.service === "Complete Pampering" ? (
    <div className="rounded-[20px] border border-[#eee8fb] bg-[#fcfbff] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[16px] font-semibold text-[#2a2346]">
            Styling preferences & reference photos
          </div>
          <p className="mt-1.5 text-[13px] leading-[1.65] text-[#8a90a6]">
            Optional, but helpful for haircut planning and finish guidance.
          </p>
        </div>

        <span className="shrink-0 rounded-full border border-[#f2d8c3] bg-[#fff7f1] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#d97745]">
          Premium
        </span>
      </div>

      <div className="mt-3 rounded-[16px] border border-[#f5e2d6] bg-white px-4 py-3">
        <p className="text-[12px] leading-[1.65] text-[#7b6d63]">
          For Complete Pampering, our team may share a suggested haircut direction on WhatsApp before the visit based on your pet’s coat, structure, face shape, and the photos you upload.
        </p>
      </div>

      <textarea
        value={pet.stylingNotes}
        onChange={(e) => handlePetStylingNotesChange(index, e.target.value)}
        placeholder="Example: Keep the face round, reduce coat bulk, trim paws neatly, and avoid making the cut too short."
        className="mt-4 min-h-[110px] w-full rounded-[16px] border border-[#d9dbe7] bg-white px-4 py-3 text-[15px] leading-[1.6] text-[#25233a] outline-none placeholder:text-[#9096ac] focus:border-[#7c68e5] resize-none"
      />

      <div className="mt-4">
        <label className="inline-flex h-[42px] cursor-pointer items-center rounded-full border border-[#ddd1fb] bg-white px-4 text-[14px] font-medium text-[#6d5bd0]">
          Upload styling reference photos
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handlePetStylingImagesChange(index, e)}
          />
        </label>
        <p className="mt-2 text-[13px] leading-[1.6] text-[#9096ac]">
          Optional, but recommended. Add up to 5 recent front, side, or full-body photos.
        </p>
      </div>

      {pet.stylingImages.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {pet.stylingImages.map((image: File, imageIndex: number) => (
            <div
              key={`${image.name}-${imageIndex}`}
              className="relative overflow-hidden rounded-[16px] border border-[#e7defa] bg-white"
            >
              <Image
                src={URL.createObjectURL(image)}
                alt={image.name}
                width={220}
                height={110}
                unoptimized
                className="h-[110px] w-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemovePetStylingImage(index, imageIndex)}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(17,12,33,0.72)] text-[12px] font-semibold text-white"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  ) : null}

  <div className="rounded-[16px] border border-[#ece5ff] bg-white">
    <button
      type="button"
      onClick={() => togglePetNotesPanel(index)}
      className="flex w-full items-center justify-between px-4 py-3 text-left"
    >
      <div>
        <div className="text-[14px] font-semibold text-[#2a2346]">
          Add grooming notes
        </div>
        <div className="mt-1 text-[12px] text-[#9aa1b2]">
          Optional
        </div>
      </div>

      <span className="text-[18px] leading-none text-[#8f85c7]">
        {expandedPetNotes.includes(index) ? "−" : "+"}
      </span>
    </button>

    {expandedPetNotes.includes(index) ? (
      <div className="border-t border-[#f1ebff] px-4 pb-4 pt-3">
        <textarea
          value={pet.groomingNotes}
          onChange={(e) => handlePetGroomingNotesChange(index, e.target.value)}
          placeholder="Example: Sensitive near ears, mild matting, skin concern on one area, or needs gentle handling around the paws."
          className="w-full rounded-[14px] border border-[#d9dbe7] bg-[#fcfcff] px-4 py-3 text-[14px] leading-[1.65] text-[#25233a] outline-none placeholder:text-[#9aa1b2] focus:border-[#7c68e5] resize-none"
          rows={3}
        />

        <div className="mt-3">
          <label className="inline-flex h-[40px] cursor-pointer items-center rounded-full border border-[#ddd1fb] bg-white px-4 text-[13px] font-medium text-[#6d5bd0]">
            Upload concern photo
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handlePetConcernImagesChange(index, e)}
            />
          </label>
          <p className="mt-2 text-[12px] leading-[1.6] text-[#8a90a6]">
            Optional. Use this if you want to highlight matting, skin sensitivity, or an area needing extra care.
          </p>
        </div>

        {pet.concernImages.length > 0 ? (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {pet.concernImages.map((image: File, imageIndex: number) => (
              <div
                key={`${image.name}-${imageIndex}`}
                className="relative overflow-hidden rounded-[14px] border border-[#e7defa] bg-white"
              >
                <Image
                  src={URL.createObjectURL(image)}
                  alt={image.name}
                  width={192}
                  height={96}
                  unoptimized
                  className="h-[96px] w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemovePetConcernImage(index, imageIndex)}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(17,12,33,0.72)] text-[12px] font-semibold text-white"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    ) : null}
  </div>
</div>
  ) : null}
</div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* ── Section 3: Date + slot selection ── */}
                <section className="space-y-5">
                  <div className="text-[22px] font-bold text-[#25233a]">Select an available booking window</div>

                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {availabilityDates.map((dateItem) => {
                      const isSelected = selectedDate === dateItem.date;
                      const hasAvailability = dateItem.totalBookingWindows > 0;
                      return (
                        <button
                          key={dateItem.date}
                          type="button"
                          onClick={() => handleSelectDate(dateItem.date)}
                          className={`min-w-[160px] shrink-0 rounded-[22px] border px-5 py-5 text-left transition ${isSelected ? "border-[#6d5bd0] bg-[#f6f3ff] shadow-[0_12px_30px_rgba(109,91,208,0.10)]" : hasAvailability ? "border-[#d9dbe7] bg-white hover:border-[#c8bcf5]" : "border-[#ebe7f4] bg-[#f8f6fc] opacity-55"}`}
                        >
                          <div className="text-[15px] font-semibold text-[#25233a]">
                            {new Date(`${dateItem.date}T00:00:00`).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}
                          </div>
                          <div className="mt-2 text-[13px] text-[#8a90a6]">
                            {hasAvailability ? `${dateItem.totalBookingWindows} windows` : "No slots"}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-3">
                    {bookingWindows.length > 0 ? bookingWindows.map((window) => {
                      const isSelected = selectedBookingWindowId === window.bookingWindowId;
                      return (
                        <button
                          key={window.bookingWindowId}
                          type="button"
                          onClick={() => setSelectedBookingWindowId(window.bookingWindowId)}
                          className={`w-full rounded-[26px] border px-7 py-6 text-left transition ${isSelected ? "border-[#6d5bd0] bg-[#faf7ff] shadow-[0_12px_30px_rgba(109,91,208,0.10)]" : "border-[#dfe2ee] bg-white hover:border-[#c8bcf5]"}`}
                        >
                          <div className="flex items-center justify-between gap-6">
                            <div>
                              <div className="text-[28px] font-black tracking-[-0.03em] text-[#25233a]">{window.displayLabel}</div>
                              <div className="mt-1.5 text-[15px] text-[#6b7285]">Handled by {window.teamName}</div>
                              <div className="mt-1 text-[13px] text-[#9096ac]">{window.petCount} pet{window.petCount > 1 ? "s" : ""} · {window.slotLabels.length} slot{window.slotLabels.length > 1 ? "s" : ""}</div>
                            </div>
                            <span className={`inline-flex h-[44px] shrink-0 items-center rounded-full px-5 text-[14px] font-semibold transition ${isSelected ? "bg-[#6d5bd0] text-white" : "bg-[#f0eefa] text-[#6c7286]"}`}>
                              {isSelected ? "Selected" : "Tap to select"}
                            </span>
                          </div>
                        </button>
                      );
                    }) : (
                      <div className="rounded-[26px] border border-[#ebe7f4] bg-[#faf9fc] p-6 text-center">
                        <div className="text-[16px] font-semibold text-[#2a2346]">No booking windows available on this date.</div>
                        <p className="mt-2 text-[14px] text-[#8a90a6]">Try another date above or reduce the number of pets.</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* ── Section 4: Payment ── */}
                <section className="rounded-[28px] border border-[#e9e0fb] bg-white p-7">
                  <div className="text-[22px] font-bold text-[#25233a]">Payment</div>
                  <p className="mt-1 text-[15px] text-[#6b7285]">Prepaid bookings unlock offers. Pay-after-service bookings are charged at the standard package price.</p>

                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => handlePaymentMethodChange("pay_now")}
                      className={`rounded-[22px] border p-6 text-left transition-all duration-300 ${paymentMethod === "pay_now" ? "border-[#6d5bd0] bg-[#faf7ff] shadow-[0_12px_30px_rgba(109,91,208,0.10)]" : "border-[#d9dbe7] bg-white hover:border-[#c8bcf5]"}`}
                    >
                      <div className="text-[20px] font-black text-[#25233a]">Pay Now</div>
                      <p className="mt-2 text-[14px] leading-[1.7] text-[#6b7285]">Reserve instantly and unlock coupon savings.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePaymentMethodChange("pay_after_service")}
                      className={`rounded-[22px] border p-6 text-left transition-all duration-300 ${paymentMethod === "pay_after_service" ? "border-[#6d5bd0] bg-[#faf7ff] shadow-[0_12px_30px_rgba(109,91,208,0.10)]" : "border-[#d9dbe7] bg-white hover:border-[#c8bcf5]"}`}
                    >
                      <div className="text-[20px] font-black text-[#25233a]">Pay After Service</div>
                      <p className="mt-2 text-[14px] leading-[1.7] text-[#6b7285]">Confirm now and pay once the grooming session is completed.</p>
                    </button>
                  </div>

                  {paymentMethod === "pay_now" ? (
                    <div className="mt-5 rounded-[22px] border border-[#e9e0fb] bg-[#fbf9ff] p-5">
                      <div className="text-[16px] font-bold text-[#25233a]">Coupon</div>
                      <div className="mt-3">
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => { const v = e.target.value.toUpperCase(); setCouponCode(v); updatePricingPreview(v); }}
                          placeholder="Enter coupon code"
                          className="h-[50px] w-full rounded-[16px] border border-[#d9dbe7] bg-white px-4 text-[15px] uppercase outline-none focus:border-[#7c68e5]"
                        />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2.5">
                        {availableCoupons.map((coupon) => {
                          const isApplied = couponCode.trim().toUpperCase() === coupon.code;
                          return (
                            <button key={coupon.code} type="button" onClick={() => applyCouponCode(coupon.code)} className={`rounded-[14px] border px-4 py-2.5 text-[13px] font-semibold transition ${isApplied ? "border-[#6d5bd0] bg-[#f6f3ff] text-[#6d5bd0]" : "border-[#ddd1fb] bg-white text-[#4f477f] hover:border-[#c8bcf5]"}`}>
                              {coupon.code} · {coupon.label}
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-3 text-[13px] text-[#9096ac]">Coupons apply only on prepaid bookings.</p>
                    </div>
                  ) : null}

                  <div className="mt-5 rounded-[22px] border border-[#e9e0fb] bg-[#fbf9ff] p-5">
                    <div className="flex items-center justify-between text-[15px] text-[#6b7285]">
                      <span>Original amount</span>
                      <span>₹{pricingPreview.originalAmount}</span>
                    </div>
                    {pricingPreview.finalAmount < pricingPreview.originalAmount ? (
                      <div className="mt-3 flex items-center justify-between text-[15px] text-[#119b73]">
                        <span>Discount</span>
                        <span>-₹{pricingPreview.originalAmount - pricingPreview.finalAmount}</span>
                      </div>
                    ) : null}
                    <div className="my-4 h-px bg-[#ece6fb]" />
                    <div className="flex items-end justify-between">
                      <span className="text-[17px] font-semibold text-[#25233a]">Total</span>
                      <span className="text-[30px] font-black tracking-[-0.03em] text-[#25233a]">₹{pricingPreview.finalAmount}</span>
                    </div>
                  </div>
                </section>
              </>
            ) : null}

          </div>
        )}

        </main>

        {/* ── Desktop Footer (pinned CTA) ── */}
        {!confirmedBooking && availabilityDates.length > 0 && (
          <footer className="shrink-0 border-t border-[#ece6fb] bg-white px-10 py-5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-h-[20px] flex-1">
                {bookingCreateError ? (
                  <p className="text-[14px] text-red-500">{bookingCreateError}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={closeSlotsModal}
                  className="inline-flex h-[52px] items-center justify-center rounded-[18px] border border-[#d9dbe7] bg-white px-7 text-[15px] font-semibold text-[#2a2745] transition hover:bg-[#faf9ff]"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleCreateBooking}
                  disabled={!canContinueBooking || bookingCreateLoading}
                  className="inline-flex h-[52px] items-center justify-center rounded-[18px] bg-[#6d5bd0] px-8 text-[15px] font-semibold text-white shadow-[0_14px_30px_rgba(109,91,208,0.20)] transition hover:bg-[#5f4fc2] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {bookingCreateLoading
                    ? "Creating booking..."
                    : paymentMethod === "pay_now"
                    ? "Continue to payment"
                    : "Confirm booking"}
                </button>
              </div>
            </div>
          </footer>
        )}

      </div>{/* end desktop wrapper */}
    </div>
  </div>
) : null}
      {/* =====================================================
    12B. TRACK BOOKING MODAL
===================================================== */}
{isTrackBookingOpen ? (
  <>
    {/* ── MOBILE: My bookings sheet (< md) ── */}
    <div
  className={`fixed inset-0 z-[110] md:hidden ${
    isCompactTrackEntry
      ? "flex items-start justify-center bg-[rgba(17,12,33,0.58)] px-4 pt-10 backdrop-blur-[3px]"
      : "flex flex-col bg-[#f8f7fc]"
  }`}
>
  <div
    className={
      isCompactTrackEntry
        ? "w-full max-w-[420px] overflow-hidden rounded-[28px] border border-white/20 bg-[linear-gradient(180deg,#ffffff_0%,#fcfbff_100%)] shadow-[0_30px_80px_rgba(20,10,50,0.28)]"
        : "flex h-full w-full flex-col"
    }
  >
      {/* Header */}
<div
  className={`flex items-center justify-between border-b border-[#ede8fa] ${
    isCompactTrackEntry
      ? "bg-white px-4 py-4"
      : "shrink-0 bg-white/95 px-4 pb-3 pt-[env(safe-area-inset-top,14px)] backdrop-blur"
  }`}
>
        <div className="text-[16px] font-black tracking-[-0.02em] text-[#1f1f2c]">My bookings</div>
        <button type="button" onClick={closeTrackBookingModal} className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ece8f5] bg-white text-[#2a2346]">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable body */}
      <div
  className={
    isCompactTrackEntry
      ? "px-4 pb-5 pt-4"
      : "flex-1 overflow-y-auto px-4 pb-[env(safe-area-inset-bottom,24px)] pt-4"
  }
>

        {/* Search row */}
        <div className="flex gap-2">
          <input
            type="text"
            value={trackPhone}
            onChange={(e) => setTrackPhone(e.target.value)}
            placeholder="Enter your mobile number"
            className="h-[46px] flex-1 rounded-[14px] border border-[#d9dbe7] bg-white px-4 text-[14px] outline-none focus:border-[#9c8cff]"
          />
          <button
            type="button"
            onClick={handleTrackBooking}
            disabled={trackLoading}
            className="h-[46px] rounded-[14px] bg-[#6d5bd0] px-5 text-[13px] font-semibold text-white disabled:opacity-60"
          >
            {trackLoading ? "…" : "Search"}
          </button>
        </div>
        <p className="mt-2 text-[12px] text-[#9aa1b2]">Enter your mobile number to view your bookings.</p>


        {trackError ? <div className="mt-3 rounded-[14px] border border-[#ffd7d7] bg-[#fff8f8] px-4 py-2.5 text-[13px] text-[#b42318]">{trackError}</div> : null}
        {trackSuccessMessage ? <div className="mt-3 rounded-[14px] border border-[#d8f0df] bg-[#f6fff8] px-4 py-2.5 text-[13px] text-[#11795d]">{trackSuccessMessage}</div> : null}
        {rescheduleSuccessMessage ? <div className="mt-3 rounded-[14px] border border-[#d8f0df] bg-[#f6fff8] px-4 py-2.5 text-[13px] text-[#11795d]">{rescheduleSuccessMessage}</div> : null}

        {trackedBookings.length > 0 ? (() => {
  const filtered = trackedBookings.filter((b) =>
    bookingsTab === "upcoming"
      ? b.statusCategory === "upcoming"
      : b.statusCategory === "past"
  );

  return (
    <>
      <div className="mt-3 flex items-center justify-between gap-3">
  <div className="text-[12px] font-medium text-[#8a90a6]">
    Saved companions
  </div>

  <button
    type="button"
    onClick={() => {
      loadCompanions(trackPhone || heroForm.phone);
      setIsSavedCompanionsOpen(true);
    }}
    className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#ddd1fb] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#6d5bd0]"
  >
    Manage companions
  </button>
</div>

      {/* Tab switcher */}
              <div className="mt-4 flex rounded-[14px] border border-[#e8e3f5] bg-white p-1 gap-1">
                {(["upcoming", "past"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setBookingsTab(tab)}
                    className={`flex-1 rounded-[11px] py-2 text-[12px] font-semibold capitalize transition ${bookingsTab === tab ? "bg-[#6d5bd0] text-white shadow-sm" : "text-[#8a90a6]"}`}
                  >
                    {tab === "upcoming" ? "Upcoming" : "Past"}
                  </button>
                ))}
              </div>

              {/* Loyalty progress strip */}
              <div className="mt-3">
                {loyaltyStatusLoading ? (
                  <div className="rounded-[18px] border border-[#ece5ff] bg-[linear-gradient(180deg,#ffffff_0%,#fcfbff_100%)] p-4 text-[13px] text-[#8a90a6]">
                    Loading loyalty status...
                  </div>
                ) : (
                  renderLoyaltySummaryCard(loyaltyStatus, "my_bookings")
                )}
              </div>

              {/* Card list */}
              <div className="mt-3 space-y-3">
                {filtered.length === 0 ? (
                  <div className="py-10 text-center text-[13px] text-[#9aa1b2]">No {bookingsTab} bookings.</div>
                ) : filtered.map((booking) => {
                  const card = getBookingCardModel(booking);
                  const isExpanded = expandedBookingId === booking.id;

                  return (
                    <div
                      key={booking.id}
                      className={`overflow-hidden rounded-[20px] border bg-white shadow-[0_4px_16px_rgba(73,44,120,0.05)] transition-opacity ${card.showMutedStyle ? "opacity-75" : ""} ${card.tone === "warning" ? "border-[#fde68a]" : card.tone === "danger" ? "border-[#ffd7d7]" : "border-[#e8e3f5]"}`}
                    >
                      {/* Card header */}
                      <div className="flex items-start gap-3 p-4">
                        <span className={`mt-0.5 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${toneBadgeStyle[card.tone]}`}>
                          {card.statusLabel}
                        </span>
                        {card.urgencyText ? (
                          <span className="shrink-0 rounded-full bg-[#fff9ed] px-2 py-0.5 text-[10px] font-semibold text-[#b45309]">
                            {card.urgencyText}
                          </span>
                        ) : null}
                      </div>

                      {/* Service + date */}
                      <div className="px-4 pb-3">
                        <div className="text-[15px] font-bold text-[#1f1f2c]">{booking.service.name}</div>
                        <div className="mt-0.5 text-[12px] text-[#8a90a6]">{card.dateText} · {card.windowText}</div>
                        <div className="mt-0.5 text-[11px] text-[#b0b5c8]">{card.cityText}</div>
                        {booking.pets.length > 0 ? (
                          <div className="mt-1 text-[11px] text-[#6b7280]">🐾 {card.petsText}</div>
                        ) : null}
                      </div>

                      {/* Payment bar */}
                      <div className="flex items-center justify-between border-t border-[#f0ecfa] px-4 py-2.5">
                        <span className="text-[11px] text-[#9aa1b2]">{card.paymentText}</span>
                        <span className="text-[13px] font-bold text-[#2a2346]">{card.amountText}</span>
                      </div>

                      {/* Primary CTA — visible on collapsed card */}
                      {card.primaryAction ? (
                        <div className="border-t border-[#f0ecfa] px-4 py-3">
                          <button
                            type="button"
                            onClick={() => {
                              handleBookingCardAction(booking, card.primaryAction!);
                            }}
                            className={`h-[40px] w-full rounded-[12px] text-[12px] font-bold ${
                              card.primaryAction.emphasis === "primary"
                                ? "bg-[#6d5bd0] text-white"
                                : card.primaryAction.emphasis === "danger"
                                ? "border border-[#ffd7d7] bg-[#fff8f8] text-[#b42318]"
                                : "border border-[#e5e7eb] bg-white text-[#2a2346]"
                            }`}
                          >
                            {card.primaryAction.label}
                          </button>
                        </div>
                      ) : null}

                      {/* Expanded details */}
                      {isExpanded ? (
                        <div className="border-t border-[#f0ecfa] space-y-4 px-4 py-4">
                          {/* Booking summary */}
                          <div>
                            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#b0b5c8]">Booking</div>
                            <div className="grid grid-cols-2 gap-px rounded-[12px] bg-[#f0ecfa] overflow-hidden">
                              {[
                                ["ID", booking.id.slice(0, 14) + "…"],
                                ["Created", new Date(booking.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })],
                                ["Date", card.dateText],
                                ["Window", card.windowText],
                                ["Team", booking.bookingWindow?.teamName ?? "—"],
                                ["City", card.cityText],
                              ].map(([label, value]) => (
                                <div key={label} className="bg-white px-3 py-2">
                                  <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#b0b5c8]">{label}</div>
                                  <div className="mt-0.5 text-[12px] font-bold text-[#2a2346] truncate">{value}</div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Payment summary */}
                          <div>
                            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#b0b5c8]">Payment</div>
                            <div className="rounded-[12px] border border-[#f0ecfa] bg-[#faf8ff] px-4 py-3 space-y-1.5">
                              <div className="flex justify-between text-[12px]">
                                <span className="text-[#8a90a6]">Original</span>
                                <span className="font-semibold text-[#2a2346]">₹{booking.originalAmount}</span>
                              </div>
                              {booking.discountAmount > 0 ? (
                                <div className="flex justify-between text-[12px]">
                                  <span className="text-[#11804d]">Discount {booking.couponCode ? `(${booking.couponCode})` : ""}</span>
                                  <span className="font-semibold text-[#11804d]">−₹{booking.discountAmount}</span>
                                </div>
                              ) : null}
                              <div className="flex justify-between border-t border-[#e9e0fb] pt-1.5 text-[13px]">
                                <span className="font-bold text-[#2a2346]">Total</span>
                                <span className="font-bold text-[#2a2346]">{card.amountText}</span>
                              </div>
                              <div className="flex justify-between text-[11px]">
                                <span className="text-[#9aa1b2]">Method</span>
                                <span className="text-[#4b4370]">{booking.paymentMethodLabel ?? "—"}</span>
                              </div>
                              <div className="flex justify-between text-[11px]">
                                <span className="text-[#9aa1b2]">Status</span>
                                <span className="text-[#4b4370]">{card.paymentText}</span>
                              </div>
                              {booking.paymentWindow.expiresAt && booking.paymentWindow.holdActive ? (
                                <div className="text-[11px] text-[#b45309]">
                                  Hold expires at {new Date(booking.paymentWindow.expiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                                </div>
                              ) : null}
                            </div>
                          </div>

                          {/* Pets */}
                          {booking.pets.length > 0 ? (
                            <div>
                              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#b0b5c8]">Pets</div>
                              <div className="space-y-2">
                                {booking.pets.map((pet) => (
                                  <div key={pet.id} className="rounded-[12px] border border-[#f0ecfa] bg-white px-3 py-2.5">
                                    <div className="text-[12px] font-bold text-[#2a2346]">{pet.name ?? "Unnamed"} · {pet.breed}</div>
                                    {pet.groomingNotes ? <div className="mt-1 text-[11px] text-[#6b7280]">Grooming: {pet.groomingNotes}</div> : null}
                                    {pet.stylingNotes ? <div className="mt-0.5 text-[11px] text-[#6b7280]">Styling: {pet.stylingNotes}</div> : null}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {/* Loyalty */}
                          {booking.loyalty.rewardApplied || booking.loyalty.eligible ? (
                            <div>
                              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#b0b5c8]">Loyalty</div>
                              <div className="rounded-[12px] border border-[#f0ecfa] bg-[#faf8ff] px-3 py-2.5 text-[11px] text-[#4b4370]">
                                {booking.loyalty.rewardApplied
                                  ? <span className="font-semibold text-[#6d5bd0]">🎁 {booking.loyalty.rewardLabel ?? "Free session — loyalty reward"}</span>
                                  : <span>Counts toward your free session reward</span>
                                }
                              </div>
                            </div>
                          ) : null}

                          {/* Timeline */}
                          {booking.timeline.length > 0 ? (
                            <div>
                              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#b0b5c8]">Timeline</div>
                              <div className="space-y-1.5">
                                {booking.timeline.map((event, i) => (
                                  <div key={i} className="flex items-start gap-2.5 text-[11px]">
                                    <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[#6d5bd0]" />
                                    <div>
                                      <span className="font-semibold text-[#2a2346]">{event.label}</span>
                                      {event.at ? <span className="ml-1.5 text-[#9aa1b2]">{new Date(event.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span> : null}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {/* Secondary actions */}
                          {card.secondaryActions.length > 0 ? (
                            <div className="space-y-2 pt-1">
                              {card.secondaryActions.map((action) => (
                                <button
                                  key={action.id}
                                  type="button"
                                  onClick={() => handleBookingCardAction(booking, action)}
                                  className={`h-[38px] w-full rounded-[11px] text-[12px] font-semibold ${
                                    action.emphasis === "danger"
                                      ? "border border-[#ffd7d7] bg-[#fff8f8] text-[#b42318]"
                                      : "border border-[#e5e7eb] bg-white text-[#2a2346]"
                                  }`}
                                >
                                  {action.label}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {/* Footer row */}
                      <div className="flex items-center border-t border-[#f0ecfa]">
                        <button
                          type="button"
                          onClick={() => setExpandedBookingId(isExpanded ? null : booking.id)}
                          className="flex flex-1 items-center justify-center gap-1 py-3 text-[12px] font-semibold text-[#6d5bd0]"
                        >
                          {isExpanded ? "Hide details" : "View details"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          );
        })() : null}
      </div>
    </div>
  </div>

    {/* ── DESKTOP My bookings modal (≥ md) ── */}
    <div className="fixed inset-0 z-[110] hidden items-start justify-center overflow-y-auto bg-[rgba(17,12,33,0.58)] px-4 py-8 backdrop-blur-[3px] md:flex">
      <div className="relative w-full max-w-[860px] rounded-[32px] border border-white/20 bg-[linear-gradient(180deg,#ffffff_0%,#fcfbff_100%)] p-7 shadow-[0_40px_120px_rgba(20,10,50,0.30)] md:p-9">
        <button
          type="button"
          onClick={closeTrackBookingModal}
          className="absolute right-6 top-6 flex h-11 w-11 items-center justify-center rounded-full border border-[#e5e7eb] bg-white text-[#2a2346] shadow-[0_8px_20px_rgba(42,35,70,0.06)] transition hover:bg-[#fafafa]"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="pr-14">
          <div className="text-[28px] font-black tracking-[-0.03em] text-[#1f1f2c]">My bookings</div>
          <p className="mt-1.5 text-[15px] text-[#6b7280]">Enter your mobile number to load your history.</p>
        </div>

        {/* Search row */}
        <div className="mt-6 flex gap-3">
          <input
            type="text"
            value={trackPhone}
            onChange={(e) => setTrackPhone(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleTrackBooking(); }}
            placeholder="Mobile number"
            className="h-[50px] flex-1 rounded-[16px] border border-[#d9dbe7] bg-white px-4 text-[15px] outline-none focus:border-[#9c8cff]"
          />
          <button
            type="button"
            onClick={handleTrackBooking}
            disabled={trackLoading}
            className="inline-flex h-[50px] shrink-0 items-center justify-center rounded-[16px] bg-[#6d5bd0] px-6 text-[15px] font-semibold text-white shadow-[0_12px_28px_rgba(109,91,208,0.20)] transition hover:bg-[#5f4fc2] disabled:opacity-60"
          >
            {trackLoading ? "Loading…" : "View bookings"}
          </button>
        </div>
        

        {trackError ? (
          <div className="mt-3 rounded-[14px] border border-[#ffd7d7] bg-[#fff8f8] px-4 py-3 text-[13px] text-[#b42318]">{trackError}</div>
        ) : null}
        {(trackSuccessMessage || rescheduleSuccessMessage) ? (
          <div className="mt-3 rounded-[14px] border border-[#d8f0df] bg-[#f6fff8] px-4 py-3 text-[13px] text-[#11795d]">{trackSuccessMessage || rescheduleSuccessMessage}</div>
        ) : null}

        {trackedBookings.length > 0 ? (() => {
  const filtered = trackedBookings.filter((b) =>
    bookingsTab === "upcoming"
      ? b.statusCategory === "upcoming"
      : b.statusCategory === "past"
  );

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between">
  <div className="text-[13px] font-medium text-[#8a90a6]">
    Saved companions
  </div>

  <button
    type="button"
    onClick={() => {
      loadCompanions(trackPhone || heroForm.phone);
      setIsSavedCompanionsOpen(true);
    }}
    className="inline-flex items-center gap-2 rounded-full border border-[#ddd1fb] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#6d5bd0]"
  >
    Manage companions
  </button>
</div>

      {/* Tabs */}
              {/* Tabs */}
              <div className="flex gap-1 rounded-[14px] border border-[#e8e3f5] bg-white p-1">
                {(["upcoming", "past"] as const).map((tab) => (
                  <button key={tab} type="button" onClick={() => setBookingsTab(tab)}
                    className={`flex-1 rounded-[11px] py-2 text-[13px] font-semibold capitalize transition ${bookingsTab === tab ? "bg-[#6d5bd0] text-white shadow-sm" : "text-[#8a90a6]"}`}>
                    {tab === "upcoming" ? "Upcoming" : "Past"}
                  </button>
                ))}
              </div>

              {/* Loyalty strip */}
              <div className="mt-3">
                {loyaltyStatusLoading ? (
                  <div className="rounded-[18px] border border-[#ece5ff] bg-[linear-gradient(180deg,#ffffff_0%,#fcfbff_100%)] p-4 text-[13px] text-[#8a90a6]">
                    Loading loyalty status...
                  </div>
                ) : (
                  renderLoyaltySummaryCard(loyaltyStatus, "my_bookings")
                )}
              </div>

              {/* Cards */}
<div className="mt-4 space-y-4">
                {filtered.length === 0 ? (
                  <div className="py-12 text-center text-[14px] text-[#9aa1b2]">No {bookingsTab} bookings.</div>
                ) : filtered.map((booking) => {
                  const card = getBookingCardModel(booking);
                  const isExpanded = expandedBookingId === booking.id;

                  return (
                    <div key={booking.id} className={`overflow-hidden rounded-[24px] border bg-white shadow-[0_4px_20px_rgba(73,44,120,0.06)] transition-opacity ${card.showMutedStyle ? "opacity-75" : ""} ${card.tone === "warning" ? "border-[#fde68a]" : card.tone === "danger" ? "border-[#ffd7d7]" : "border-[#e8e3f5]"}`}>

                      {/* Card header */}
                      <div className="flex items-center justify-between gap-4 px-5 pt-5 pb-1">
                        <div className="flex items-center gap-3">
                          <span className={`rounded-full px-3 py-1 text-[12px] font-bold ${toneBadgeStyle[card.tone]}`}>{card.statusLabel}</span>
                          {card.urgencyText ? <span className="rounded-full bg-[#fff9ed] px-2.5 py-0.5 text-[11px] font-semibold text-[#b45309]">{card.urgencyText}</span> : null}
                        </div>
                        <div className="text-[12px] text-[#b0b5c8]">{new Date(booking.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
                      </div>

                      {/* Service + meta */}
                      <div className="px-5 pb-4 pt-2">
                        <div className="text-[16px] font-bold text-[#1f1f2c]">{booking.service.name}</div>
                        <div className="mt-1 text-[13px] text-[#8a90a6]">{card.dateText} · {card.windowText}</div>
                        <div className="mt-0.5 text-[12px] text-[#b0b5c8]">{card.cityText}{booking.bookingWindow?.teamName ? ` · ${booking.bookingWindow.teamName}` : ""}</div>
                        {booking.pets.length > 0 ? <div className="mt-1 text-[12px] text-[#6b7280]">🐾 {card.petsText}</div> : null}
                      </div>

                      {/* Payment bar */}
                      <div className="flex items-center justify-between border-t border-[#f0ecfa] px-5 py-3">
                        <span className="text-[12px] text-[#9aa1b2]">{booking.paymentStatusLabel}{booking.paymentMethodLabel ? ` · ${booking.paymentMethodLabel}` : ""}</span>
                        <span className="text-[14px] font-bold text-[#2a2346]">{card.amountText}</span>
                      </div>

                      {/* Expanded details */}
                      {isExpanded ? (
                        <div className="border-t border-[#f0ecfa] px-5 py-5 space-y-5">
                          {/* Summary grid */}
                          <div>
                            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#b0b5c8]">Booking details</div>
                            <div className="grid grid-cols-3 gap-2.5">
                              {[
                                ["Booking ID", booking.id.slice(0, 16) + "…"],
                                ["Service", booking.service.name],
                                ["City", booking.user.city],
                                ["Date", card.dateText],
                                ["Window", card.windowText],
                                ["Team", booking.bookingWindow?.teamName ?? "—"],
                              ].map(([label, val]) => (
                                <div key={label} className="rounded-[14px] border border-[#ece7f8] bg-[#fbf9ff] p-3">
                                  <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8b90a0]">{label}</div>
                                  <div className="mt-1 text-[12px] font-bold text-[#2a2346] truncate">{val}</div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Payment summary */}
                          <div>
                            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#b0b5c8]">Payment</div>
                            <div className="rounded-[14px] border border-[#ece7f8] bg-[#fbf9ff] px-4 py-3 space-y-1.5">
                              <div className="flex justify-between text-[13px]">
                                <span className="text-[#8a90a6]">Original</span>
                                <span className="font-semibold text-[#2a2346]">₹{booking.originalAmount}</span>
                              </div>
                              {booking.discountAmount > 0 ? (
                                <div className="flex justify-between text-[13px]">
                                  <span className="text-[#11804d]">Discount {booking.couponCode ? `(${booking.couponCode})` : ""}</span>
                                  <span className="font-semibold text-[#11804d]">−₹{booking.discountAmount}</span>
                                </div>
                              ) : null}
                              <div className="flex justify-between border-t border-[#e9e0fb] pt-1.5 text-[14px]">
                                <span className="font-bold text-[#2a2346]">Total</span>
                                <span className="font-bold text-[#2a2346]">{card.amountText}</span>
                              </div>
                              <div className="flex justify-between text-[12px] pt-0.5">
                                <span className="text-[#9aa1b2]">Method</span>
                                <span className="text-[#4b4370]">{booking.paymentMethodLabel ?? "—"}</span>
                              </div>
                              <div className="flex justify-between text-[12px]">
                                <span className="text-[#9aa1b2]">Status</span>
                                <span className="text-[#4b4370]">{booking.paymentStatusLabel}</span>
                              </div>
                              {booking.paymentWindow.expiresAt && booking.paymentWindow.holdActive ? (
                                <div className="text-[12px] text-[#b45309]">Hold expires at {new Date(booking.paymentWindow.expiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div>
                              ) : null}
                            </div>
                          </div>

                          {/* Pets */}
                          {booking.pets.length > 0 ? (
                            <div>
                              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#b0b5c8]">Pets</div>
                              <div className="grid grid-cols-2 gap-2.5">
                                {booking.pets.map((pet) => (
                                  <div key={pet.id} className="rounded-[14px] border border-[#ece7f8] bg-[#fbf9ff] p-3">
                                    <div className="text-[13px] font-bold text-[#2a2346]">{pet.name ?? "Unnamed"} · {pet.breed}</div>
                                    {pet.groomingNotes ? <div className="mt-1 text-[12px] text-[#6b7280]">Grooming: {pet.groomingNotes}</div> : null}
                                    {pet.stylingNotes ? <div className="mt-0.5 text-[12px] text-[#6b7280]">Styling: {pet.stylingNotes}</div> : null}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {/* Loyalty */}
                          {(booking.loyalty.rewardApplied || booking.loyalty.eligible) ? (
                            <div>
                              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#b0b5c8]">Loyalty</div>
                              <div className="rounded-[14px] border border-[#ece7f8] bg-[#fbf9ff] px-4 py-3 text-[13px] text-[#4b4370]">
                                {booking.loyalty.rewardApplied
                                  ? <span className="font-semibold text-[#6d5bd0]">🎁 {booking.loyalty.rewardLabel ?? "Free session — loyalty reward"}</span>
                                  : <span>Counts toward your free session reward</span>
                                }
                              </div>
                            </div>
                          ) : null}

                          {/* Timeline */}
                          {booking.timeline.length > 0 ? (
                            <div>
                              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#b0b5c8]">Timeline</div>
                              <div className="flex flex-wrap gap-3">
                                {booking.timeline.map((event, i) => (
                                  <div key={i} className="flex items-center gap-2 text-[12px]">
                                    <div className="h-2 w-2 shrink-0 rounded-full bg-[#6d5bd0]" />
                                    <span className="font-semibold text-[#2a2346]">{event.label}</span>
                                    {event.at ? <span className="text-[#9aa1b2]">{new Date(event.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span> : null}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {/* Actions */}
                          <div className="flex flex-wrap gap-3 pt-1">
                            {card.primaryAction ? (
                              <button type="button"
                                onClick={() => handleBookingCardAction(booking, card.primaryAction!)}
                                className={`inline-flex h-[44px] items-center justify-center rounded-[14px] px-5 text-[13px] font-semibold transition ${
                                  card.primaryAction.emphasis === "primary" ? "bg-[#6d5bd0] text-white hover:bg-[#5b4bb5]"
                                  : "border border-[#e5e7eb] bg-white text-[#2a2346] hover:bg-[#fafafa]"
                                }`}>
                                {card.primaryAction.label}
                              </button>
                            ) : null}
                            {card.secondaryActions.map((action) => (
                              <button key={action.id} type="button"
                                onClick={() => handleBookingCardAction(booking, action)}
                                className="inline-flex h-[44px] items-center justify-center rounded-[14px] border border-[#ffd7d7] bg-[#fff8f8] px-5 text-[13px] font-semibold text-[#b42318] transition hover:bg-[#fff1f1]">
                                {action.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {/* Footer */}
                      <div className="flex items-center border-t border-[#f0ecfa]">
                        <button type="button" onClick={() => setExpandedBookingId(isExpanded ? null : booking.id)}
                          className="flex flex-1 items-center justify-center gap-1.5 py-3.5 text-[13px] font-semibold text-[#6d5bd0]">
                          {isExpanded ? "Hide details" : "View details"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })() : null}
      </div>
    </div>
  </>
) : null}
{/* =====================================================
    12C-1. SAVED COMPANIONS MODAL
===================================================== */}
{isSavedCompanionsOpen ? (
  <div className="fixed inset-0 z-[240] flex items-end justify-center px-4 pb-4 pt-10 sm:items-center">
    <div
      className="absolute inset-0 bg-[rgba(17,12,33,0.55)] backdrop-blur-[3px]"
      onClick={() => setIsSavedCompanionsOpen(false)}
    />

    <div className="relative z-10 w-full max-w-[760px] overflow-hidden rounded-[30px] border border-[#ebe5ff] bg-[linear-gradient(180deg,#ffffff_0%,#fcfbff_100%)] shadow-[0_30px_80px_rgba(18,15,28,0.18)]">
      {/* Header */}
      <div className="border-b border-[#f0ecfa] bg-white px-5 py-5 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[22px] font-black tracking-[-0.03em] text-[#1f1f2c] sm:text-[24px]">
              Saved companions
            </div>
            <p className="mt-1.5 max-w-[420px] text-[13px] leading-[1.65] text-[#6b7280]">
              Manage the pets you book for most often.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsSavedCompanionsOpen(false)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#ece8f5] bg-white text-[#8a90a6]"
          >
            ✕
          </button>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={openCreateCompanionEditor}
            className="inline-flex h-[44px] items-center justify-center rounded-[14px] bg-[#6d5bd0] px-5 text-[13px] font-semibold text-white shadow-[0_12px_28px_rgba(109,91,208,0.18)] transition hover:opacity-95"
          >
            Add companion
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="max-h-[72vh] overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
        {companionsError ? (
          <div className="mb-4 rounded-[16px] border border-[#ffd7d7] bg-[#fff8f8] px-4 py-3 text-[13px] text-[#b42318]">
            {companionsError}
          </div>
        ) : null}

        {companionsLoading ? (
          <div className="rounded-[20px] border border-[#ece5ff] bg-[#fbf9ff] px-4 py-4 text-[13px] text-[#8a90a6]">
            Loading saved companions…
          </div>
        ) : companions.length === 0 ? (
          <div className="rounded-[24px] border border-[#ebe7f4] bg-[#faf9fc] px-6 py-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f4efff] text-[24px]">
              🐾
            </div>
            <div className="mt-4 text-[18px] font-bold text-[#2a2346]">
              No saved companions yet
            </div>
            <p className="mx-auto mt-2 max-w-[420px] text-[14px] leading-[1.7] text-[#8a90a6]">
              Your saved companions will appear here after your first booking, or you can add one now.
            </p>
            <button
              type="button"
              onClick={openCreateCompanionEditor}
              className="mt-5 inline-flex h-[42px] items-center justify-center rounded-[14px] border border-[#ddd1fb] bg-white px-5 text-[13px] font-semibold text-[#6d5bd0]"
            >
              Add companion
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {companions.map((companion) => {
  const avatarLabel =
    companion.name?.trim() || companion.breed || "Pet";

  const hasNotes =
    !!companion.defaultGroomingNotes || !!companion.defaultStylingNotes;

  return (
    <div
      key={companion.id}
      className="rounded-[22px] border border-[#ebe5ff] bg-white px-4 py-4 shadow-[0_10px_28px_rgba(73,44,120,0.05)] sm:px-5 sm:py-4.5"
    >
      <div className="flex items-start gap-3.5">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#ece5ff] bg-[#f7f3ff] text-[22px]">
          {companion.avatarUrl ? (
            <Image
              src={companion.avatarUrl}
              alt={avatarLabel}
              fill
              sizes="56px"
              unoptimized
              className="object-cover"
            />
          ) : companion.species === "cat" ? (
            "🐱"
          ) : companion.species === "dog" ? (
            "🐶"
          ) : (
            <span className="text-[13px] font-bold text-[#6d5bd0]">
              {avatarLabel
                .split(" ")
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase() ?? "")
                .join("") || "P"}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-[16px] font-bold tracking-[-0.01em] text-[#2a2346]">
                {companion.name || "Unnamed companion"}
              </div>
              <div className="mt-0.5 truncate text-[13px] text-[#6b7280]">
                {companion.breed}
              </div>
            </div>

            <span className="shrink-0 rounded-full bg-[#f4efff] px-2.5 py-1 text-[10px] font-semibold text-[#6d5bd0]">
              {companion.species === "dog"
                ? "Dog"
                : companion.species === "cat"
                ? "Cat"
                : "Pet"}
            </span>
          </div>

          <div className="mt-2 text-[12px] text-[#9aa1b2]">
            {companion.lastBookedAt
              ? `Last booked ${new Date(companion.lastBookedAt).toLocaleDateString([], {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}`
              : "New companion"}
          </div>

          {hasNotes ? (
            <div className="mt-3 rounded-[14px] bg-[#fcfbff] px-3 py-2.5">
              {companion.defaultGroomingNotes ? (
                <div className="text-[12px] leading-[1.55] text-[#5d566f]">
                  <span className="font-semibold text-[#2a2346]">Grooming:</span>{" "}
                  {companion.defaultGroomingNotes}
                </div>
              ) : null}

              {companion.defaultStylingNotes ? (
                <div className="mt-1.5 text-[12px] leading-[1.55] text-[#5d566f]">
                  <span className="font-semibold text-[#2a2346]">Styling:</span>{" "}
                  {companion.defaultStylingNotes}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-3 text-[12px] text-[#b0b5c8]">
              No default care notes saved yet.
            </div>
          )}

          <div className="mt-4 flex gap-2.5">
            <button
              type="button"
              onClick={() => openEditCompanionEditor(companion)}
              className="inline-flex h-[40px] flex-1 items-center justify-center rounded-[13px] border border-[#ddd1fb] bg-white px-4 text-[13px] font-semibold text-[#6d5bd0]"
            >
              Edit
            </button>

            <button
              type="button"
              onClick={() => archiveCompanion(companion.id)}
              className="inline-flex h-[40px] items-center justify-center rounded-[13px] border border-[#f3d6d6] bg-[#fffafa] px-4 text-[13px] font-semibold text-[#c24134]"
            >
              Archive
            </button>
          </div>
        </div>
      </div>
    </div>
  );
})}
          </div>
        )}
      </div>
    </div>
  </div>
) : null}
{/* =====================================================
    12C-2. COMPANION EDITOR MODAL
===================================================== */}
{isCompanionEditorOpen ? (
  <div className="fixed inset-0 z-[250] flex items-center justify-center px-3 py-[max(16px,env(safe-area-inset-top))] sm:px-4 sm:py-6">
    <div
      className="absolute inset-0 bg-[rgba(17,12,33,0.55)] backdrop-blur-[3px]"
      onClick={closeCompanionEditor}
    />

    <div className="relative z-10 flex max-h-[calc(100dvh-24px)] w-full max-w-[760px] flex-col overflow-hidden rounded-[28px] border border-[#e9e0fb] bg-[linear-gradient(180deg,#ffffff_0%,#fcfbff_100%)] shadow-[0_30px_80px_rgba(18,15,28,0.20)] sm:max-h-[90vh]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-[#f0ecfa] bg-white px-4 py-4 sm:px-6 sm:py-5">
        <div className="min-w-0">
          <div className="text-[20px] font-black tracking-[-0.03em] text-[#1f1f2c] sm:text-[24px]">
            {companionEditorMode === "create" ? "Add companion" : "Edit companion"}
          </div>
          <p className="mt-1 text-[13px] leading-[1.65] text-[#6b7280] sm:text-[14px]">
            Save companion details once so future bookings can prefill faster.
          </p>
        </div>

        <button
          type="button"
          onClick={closeCompanionEditor}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#ece8f5] bg-white text-[#8a90a6]"
        >
          ✕
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
        {companionEditorError ? (
          <div className="mb-4 rounded-[16px] border border-[#ffd7d7] bg-[#fff8f8] px-4 py-3 text-[13px] text-[#b42318]">
            {companionEditorError}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-[0.92fr_1.08fr]">
          {/* Profile panel */}
          <div className="rounded-[22px] border border-[#ece5ff] bg-[#fbf9ff] p-4 sm:p-5">
            <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">
              Profile
            </div>

            <div className="mt-4 flex flex-col items-center text-center">
              <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-[#ece5ff] bg-[#f7f3ff] text-[30px] shadow-[0_10px_24px_rgba(109,91,208,0.08)]">
                {companionDraft.avatarUrl ? (
                  <Image
                    src={companionDraft.avatarUrl}
                    alt={companionDraft.name || companionDraft.breed || "Companion"}
                    fill
                    sizes="80px"
                    unoptimized
                    className="object-cover"
                  />
                ) : companionDraft.species === "cat" ? (
                  "🐱"
                ) : companionDraft.species === "dog" ? (
                  "🐶"
                ) : (
                  <span className="text-[16px] font-bold text-[#6d5bd0]">
                    {(companionDraft.name || companionDraft.breed || "P")
                      .split(" ")
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase() ?? "")
                      .join("")}
                  </span>
                )}
              </div>

              <div className="mt-3 text-[13px] font-semibold text-[#2a2346]">
                Companion preview
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <label className="inline-flex h-[38px] cursor-pointer items-center justify-center rounded-[12px] border border-[#ddd1fb] bg-white px-4 text-[12px] font-semibold text-[#6d5bd0] transition hover:bg-[#faf8ff]">
                  {companionEditorUploadingAvatar
                    ? "Uploading..."
                    : companionDraft.avatarUrl
                    ? "Change photo"
                    : "Upload photo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCompanionAvatarFileChange}
                    disabled={companionEditorUploadingAvatar}
                  />
                </label>

                {companionDraft.avatarUrl ? (
                  <button
                    type="button"
                    onClick={handleRemoveCompanionAvatar}
                    className="inline-flex h-[38px] items-center justify-center rounded-[12px] border border-[#f3d6d6] bg-[#fffafa] px-4 text-[12px] font-semibold text-[#c24134]"
                  >
                    Remove
                  </button>
                ) : null}
              </div>

              <div className="mt-2 max-w-[260px] text-[12px] leading-[1.6] text-[#8a90a6]">
                Add a profile photo for faster recognition in future bookings.
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <label className="block">
                <div className="mb-1.5 text-[12px] font-semibold text-[#2a2346]">
                  Name
                </div>
                <input
                  type="text"
                  value={companionDraft.name}
                  onChange={(e) =>
                    setCompanionDraft((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Scout"
                  className="h-[48px] w-full rounded-[14px] border border-[#ddd1fb] bg-white px-4 text-[14px] text-[#2a2346] outline-none focus:border-[#6d5bd0]"
                />
              </label>

              <label className="block">
                <div className="mb-1.5 text-[12px] font-semibold text-[#2a2346]">
                  Breed
                </div>
                <input
                  type="text"
                  value={companionDraft.breed}
                  onChange={(e) =>
                    setCompanionDraft((prev) => ({ ...prev, breed: e.target.value }))
                  }
                  placeholder="Boxer"
                  className="h-[48px] w-full rounded-[14px] border border-[#ddd1fb] bg-white px-4 text-[14px] text-[#2a2346] outline-none focus:border-[#6d5bd0]"
                />
              </label>

              <label className="block">
                <div className="mb-1.5 text-[12px] font-semibold text-[#2a2346]">
                  Species
                </div>
                <select
                  value={companionDraft.species}
                  onChange={(e) =>
                    setCompanionDraft((prev) => ({
                      ...prev,
                      species: e.target.value as "dog" | "cat" | "unknown",
                    }))
                  }
                  className="h-[48px] w-full rounded-[14px] border border-[#ddd1fb] bg-white px-4 text-[14px] text-[#2a2346] outline-none focus:border-[#6d5bd0]"
                >
                  <option value="unknown">Unknown</option>
                  <option value="dog">Dog</option>
                  <option value="cat">Cat</option>
                </select>
              </label>
            </div>
          </div>

          {/* Notes panel */}
          <div className="rounded-[22px] border border-[#ece5ff] bg-white p-4 sm:p-5">
            <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">
              Default care notes
            </div>

            <div className="mt-4 space-y-4">
              <label className="block">
                <div className="mb-1.5 text-[12px] font-semibold text-[#2a2346]">
                  Default grooming notes
                </div>
                <textarea
                  value={companionDraft.defaultGroomingNotes}
                  onChange={(e) =>
                    setCompanionDraft((prev) => ({
                      ...prev,
                      defaultGroomingNotes: e.target.value,
                    }))
                  }
                  rows={5}
                  placeholder="Sensitive around ears, anxious with nail trims, gentle handling needed…"
                  className="w-full rounded-[16px] border border-[#ddd1fb] bg-[#fcfbff] px-4 py-3 text-[13px] leading-[1.65] text-[#2a2346] outline-none focus:border-[#6d5bd0]"
                />
                <div className="mt-1 text-[11px] text-[#8a90a6]">
                  Used for all package types.
                </div>
              </label>

              <label className="block">
                <div className="mb-1.5 text-[12px] font-semibold text-[#2a2346]">
                  Default styling notes
                </div>
                <textarea
                  value={companionDraft.defaultStylingNotes}
                  onChange={(e) =>
                    setCompanionDraft((prev) => ({
                      ...prev,
                      defaultStylingNotes: e.target.value,
                    }))
                  }
                  rows={5}
                  placeholder="Keep face round, shorter body trim, fluffy tail…"
                  className="w-full rounded-[16px] border border-[#ddd1fb] bg-[#fcfbff] px-4 py-3 text-[13px] leading-[1.65] text-[#2a2346] outline-none focus:border-[#6d5bd0]"
                />
                <div className="mt-1 text-[11px] text-[#8a90a6]">
                  Best used for Complete Pampering bookings.
                </div>
              </label>

              <div className="block">
                <div className="mb-1.5 text-[12px] font-semibold text-[#2a2346]">
                  Default styling references
                </div>

                <div className="rounded-[16px] border border-[#ddd1fb] bg-[#fcfbff] p-3">
                  <div className="flex flex-wrap gap-2">
                    {companionDraft.defaultStylingReferenceUrls.map((url, index) => (
                      <div
                        key={`${url}-${index}`}
                        className="relative h-20 w-20 overflow-hidden rounded-[12px] border border-[#ece5ff] bg-white"
                      >
                        <Image
                          src={url}
                          alt={`Styling reference ${index + 1}`}
                          fill
                          sizes="80px"
                          unoptimized
                          className="object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveCompanionStylingReference(index)}
                          className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[12px] font-bold text-[#c24134] shadow"
                        >
                          ×
                        </button>
                      </div>
                    ))}

                    {companionDraft.defaultStylingReferenceUrls.length < 5 ? (
                      <label className="inline-flex h-20 w-20 cursor-pointer items-center justify-center rounded-[12px] border border-dashed border-[#d8cdfa] bg-white text-center text-[11px] font-semibold text-[#6d5bd0]">
                        <span>
                          {companionEditorUploadingStylingRefs ? "Uploading..." : "Add refs"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handleCompanionStylingReferenceFilesChange}
                          disabled={companionEditorUploadingStylingRefs}
                        />
                      </label>
                    ) : null}
                  </div>

                  <div className="mt-2 text-[11px] leading-[1.5] text-[#8a90a6]">
                    Add up to 5 haircut/style reference photos for future bookings.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-[#f0ecfa] bg-[#fcfbff] px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-[12px] text-[#8a90a6]">
            You can change these defaults anytime.
          </div>

          <div className="flex flex-wrap gap-2 sm:flex-nowrap">
            {companionEditorMode === "edit" && activeCompanionId ? (
              <button
                type="button"
                onClick={() => archiveCompanion(activeCompanionId)}
                className="inline-flex h-[42px] items-center justify-center rounded-[14px] border border-[#f3d6d6] bg-[#fffafa] px-4 text-[13px] font-semibold text-[#c24134]"
              >
                Archive
              </button>
            ) : null}

            <button
              type="button"
              onClick={closeCompanionEditor}
              className="inline-flex h-[42px] items-center justify-center rounded-[14px] border border-[#e5e7eb] bg-white px-4 text-[13px] font-semibold text-[#2a2346]"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={saveCompanionEditor}
              disabled={companionEditorSaving || companionEditorUploadingAvatar}
              className="inline-flex h-[42px] items-center justify-center rounded-[14px] bg-[#6d5bd0] px-5 text-[13px] font-semibold text-white shadow-[0_12px_28px_rgba(109,91,208,0.16)] disabled:opacity-60"
            >
              {companionEditorSaving
                ? companionEditorMode === "create"
                  ? "Creating..."
                  : "Saving..."
                : companionEditorMode === "create"
                ? "Create companion"
                : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
) : null}
{/* =====================================================
    12C. RESCHEDULE SUB-MODAL
===================================================== */}
{rescheduleBookingId ? (
  <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(17,12,33,0.58)] px-4 py-6 backdrop-blur-[3px]">
    <div className="relative max-h-[88vh] w-full max-w-[760px] overflow-y-auto rounded-[32px] border border-white/20 bg-[linear-gradient(180deg,#ffffff_0%,#fcfbff_100%)] p-6 shadow-[0_40px_120px_rgba(20,10,50,0.30)] md:p-8">
      <button
        type="button"
        onClick={closeRescheduleFlow}
        className="absolute right-5 top-5 flex h-12 w-12 items-center justify-center rounded-full border border-[#e5e7eb] bg-white text-[#2a2346] shadow-[0_10px_24px_rgba(42,35,70,0.06)] transition hover:bg-[#fafafa]"
      >
        ✕
      </button>

      <div className="pr-14">
        <div className="inline-flex rounded-full border border-[#e8ddff] bg-[#faf8ff] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#6d5bd0]">
          Reschedule Booking
        </div>

        <h3 className="mt-5 text-[32px] font-black leading-[1.08] tracking-[-0.03em] text-[#1f1f2c] md:text-[38px]">
          Choose a new slot
        </h3>

        <p className="mt-4 max-w-[620px] text-[16px] leading-[1.9] text-[#6b7280]">
          Pick a new preferred date, check available booking windows, and confirm the updated slot for this booking.
        </p>
      </div>

      <div className="mt-8 rounded-[24px] border border-[#e9e1ff] bg-[linear-gradient(180deg,#faf8ff_0%,#fdfcff_100%)] p-5 shadow-[0_12px_28px_rgba(109,91,208,0.05)]">
        <div className="text-[15px] font-bold text-[#2a2346]">
          Step 1 — Select a new date
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[220px_auto]">
          <div>
            <label className="mb-2 block text-[13px] font-semibold text-[#2a2346]">
              New Date
            </label>
            <input
              type="date"
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
              className="h-[48px] w-full rounded-[14px] border border-[#d9dbe7] bg-white px-4 text-[15px] outline-none focus:border-[#9c8cff]"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleLoadRescheduleAvailability}
              disabled={rescheduleLoading}
              className="inline-flex h-[48px] items-center justify-center rounded-[14px] bg-[#6d5bd0] px-5 text-[14px] font-semibold text-white transition hover:bg-[#5f4fc2] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {rescheduleLoading ? "Checking..." : "Check Availability"}
            </button>
          </div>
        </div>

        {rescheduleError ? (
          <div className="mt-4 rounded-[16px] border border-[#ffd7d7] bg-[#fff8f8] px-4 py-3 text-[13px] text-[#b42318]">
            {rescheduleError}
          </div>
        ) : null}
      </div>

      {rescheduleWindows.length > 0 ? (
        <div className="mt-6 rounded-[24px] border border-[#e9e1ff] bg-white p-5 shadow-[0_12px_28px_rgba(109,91,208,0.05)]">
          <div className="text-[15px] font-bold text-[#2a2346]">
            Step 2 — Select a new booking window
          </div>

          <div className="mt-4 grid gap-3">
            {rescheduleWindows.map((window) => {
              const isSelected =
                selectedRescheduleWindowId === window.bookingWindowId;

              return (
                <button
                  key={window.bookingWindowId}
                  type="button"
                  onClick={() =>
                    setSelectedRescheduleWindowId(window.bookingWindowId)
                  }
                  className={`rounded-[18px] border px-4 py-4 text-left transition ${
                    isSelected
                      ? "border-[#6d5bd0] bg-[#f6f3ff] shadow-[0_12px_28px_rgba(109,91,208,0.08)]"
                      : "border-[#e5e7eb] bg-white hover:border-[#d6ccff] hover:bg-[#fcfbff]"
                  }`}
                >
                  <div className="text-[15px] font-bold text-[#2a2346]">
                    {window.teamName}
                  </div>
                  <div className="mt-1 text-[14px] text-[#6b7280]">
                    {getBookingWindowLabel(window)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 border-t border-[#f0ecff] pt-6 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={closeRescheduleFlow}
          className="inline-flex h-[48px] items-center justify-center rounded-[16px] border border-[#e5e7eb] bg-white px-5 text-[14px] font-semibold text-[#2a2346] transition hover:bg-[#fafafa]"
        >
          Close
        </button>

        <button
          type="button"
          onClick={handleConfirmReschedule}
          disabled={!selectedRescheduleWindowId || rescheduleLoading}
          className="inline-flex h-[48px] items-center justify-center rounded-[16px] bg-[#6d5bd0] px-5 text-[14px] font-semibold text-white transition hover:bg-[#5f4fc2] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Confirm Reschedule
        </button>
      </div>
    </div>
  </div>
) : null}
    {/* HEADER V2 LUXURY */}
<header className={`sticky top-0 z-50 border-b border-black/5 bg-[rgba(255,255,255,0.78)] backdrop-blur-xl transition-all duration-300 ${isHeaderScrolled ? "shadow-[0_4px_24px_rgba(0,0,0,0.06)]" : ""}`}>
  <div className={`mx-auto flex max-w-[1440px] items-center justify-between px-4 md:px-8 lg:px-12 transition-all duration-300 ${isHeaderScrolled ? "h-[56px] md:h-[72px]" : "h-[68px] md:h-[92px]"}`}>
    <div className="flex min-w-0 items-center">
      <div className="relative h-[40px] w-[150px] md:h-[72px] md:w-[280px]">
        <Image
          src="/images/logo-1.png"
          alt="All Tails"
          fill
          priority
          className="object-contain object-left"
        />
      </div>
    </div>

    <div className="ml-3 flex shrink-0 items-center gap-2 md:gap-4">
      <button
        type="button"
        onClick={openTrackBookingModal}
        className="hidden lg:inline-flex h-[40px] items-center justify-center rounded-full border border-[#ddd5f6] bg-white/92 px-4 text-[13px] font-semibold text-[#433564] shadow-[0_8px_20px_rgba(63,49,95,0.05)] transition hover:border-[#b9aceb] hover:bg-[#faf8ff] md:h-auto md:px-5 md:py-3 md:text-[15px]"
      >
        My bookings
      </button>

      <button
        type="button"
        onClick={openBookingFlow}
        className="inline-flex h-[44px] items-center justify-center rounded-full bg-[#6d5bd0] px-[22px] text-[15px] font-semibold text-white shadow-[0_8px_22px_rgba(109,91,208,0.24)] transition hover:bg-[#5f4fc2] md:h-auto md:px-6 md:py-3 md:text-[15px]"
      >
        Book
      </button>

      <button
        type="button"
        aria-label="Profile"
        className="hidden md:flex h-[38px] w-[38px] items-center justify-center rounded-full border border-[#ebe8f5] bg-white/92 text-[#2a2346] shadow-[0_8px_20px_rgba(42,35,70,0.04)] transition hover:bg-[#fafafa] sm:h-[40px] sm:w-[40px] md:h-[48px] md:w-[48px]"
      >
        <User className="h-4 w-4 md:h-5 md:w-5" />
      </button>
    </div>
  </div>
</header>
            {/* HERO SECTION */}
<section id="home-section" className="relative overflow-hidden min-h-[480px] lg:min-h-0">
  {/* MOBILE-ONLY: cinematic brand gradient */}
  <div
    className="lg:hidden absolute inset-0"
    style={{
      background:
        "radial-gradient(circle at 22% 24%, rgba(167,63,107,0.78) 0%, rgba(167,63,107,0) 38%)," +
        "radial-gradient(circle at 86% 74%, rgba(255,160,92,0.18) 0%, rgba(255,160,92,0) 28%)," +
        "radial-gradient(circle at 28% 58%, rgba(122,92,224,0.18) 0%, rgba(122,92,224,0) 34%)," +
        "linear-gradient(145deg, #1a1033 0%, #130726 46%, #0c041b 100%)",
    }}
  />
  {/* Mobile soft violet glow accent */}
  <div className="lg:hidden absolute left-[8%] top-[35%] h-[200px] w-[200px] rounded-full bg-[#6d5bd0]/18 blur-[90px]" />

  {/* DESKTOP-ONLY: banner image + overlays */}
  <div className="hidden lg:block absolute inset-0">
    <Image
      src="/images/Banner.jpg"
      alt="Professional pet grooming banner"
      fill
      priority
      className="object-cover object-center"
    />
    <div className="absolute inset-0 bg-black/58" />
    <div className="absolute left-[60px] top-[150px] h-[280px] w-[280px] rounded-full bg-[#7a5ce0]/18 blur-[110px]" />
    <div className="absolute right-[8%] top-[26%] h-[220px] w-[220px] rounded-full bg-[#ff8ec2]/10 blur-[120px]" />
  </div>

  {/* MOBILE HERO — cinematic, art-directed */}
  <div className="relative z-10 lg:hidden">
    <div className="px-4 pt-[22px] pb-28 sm:px-6">
      {/* eyebrow */}
      <div className="inline-flex h-[36px] items-center rounded-full border border-white/12 bg-white/[0.06] px-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/84">
        Premium Home Grooming
      </div>

      {/* headline */}
      <h1 className="mt-5 max-w-[320px] text-[44px] font-black leading-[0.94] tracking-[-0.045em] text-white">
        Gentle grooming,
        <br />
        <span className="bg-gradient-to-r from-[#d9d6ff] to-[#ffc59c] bg-clip-text text-transparent">
          right at home.
        </span>
      </h1>

      {/* support copy */}
      <p className="mt-[18px] max-w-[300px] text-[17px] leading-[1.65] text-white/76">
        Premium at-home care designed around your pet’s comfort.
      </p>

      {/* primary CTA */}
      <div className="mt-7">
        <button
          type="button"
          onClick={openBookingFlow}
          className="flex h-[54px] min-w-[190px] items-center justify-center rounded-full bg-[#6d5bd0] px-7 text-[16px] font-semibold text-white shadow-[0_14px_34px_rgba(109,91,208,0.28)] transition active:scale-[0.98]"
        >
          Book a Session
        </button>
      </div>

      {/* proof line */}
      <p className="mt-[18px] text-[13px] font-medium text-white/68">
        4.9 rated · 5000+ sessions · In-house teams
      </p>
    </div>
  </div>

  {/* DESKTOP HERO */}
  <div className="relative z-10 hidden lg:block">
    <div className="mx-auto grid min-h-[760px] max-w-[1440px] items-center gap-12 px-12 py-16 xl:grid-cols-[1.08fr_460px] xl:px-16">
      <div className="max-w-[760px]">
        <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-white/85 backdrop-blur-sm">
          Premium Home Grooming
        </div>

        <div className="mt-7">
          <h1 className="bg-gradient-to-r from-[#9fe7e3] via-[#7dd3fc] to-[#a78bfa] bg-clip-text text-[68px] font-black uppercase leading-[0.92] tracking-[-0.04em] text-transparent drop-shadow-[0_4px_0_rgba(20,10,50,0.8)] xl:text-[84px]">
            Professional
            <br />
            Home Grooming
          </h1>

          <h2 className="mt-4 bg-gradient-to-r from-[#ff5ea8] via-[#ff7ea1] to-[#ffb15c] bg-clip-text text-[58px] font-black uppercase leading-[0.92] tracking-[-0.04em] text-transparent drop-shadow-[0_4px_0_rgba(20,10,50,0.8)] xl:text-[72px]">
            Handled
            <br />
            With Love
          </h2>
        </div>

        <p className="mt-7 max-w-[620px] text-[18px] leading-[1.75] text-white/82">
          Safe, stress-free grooming sessions designed around your pet’s comfort,
          handled by experienced professionals right at your doorstep.
        </p>

        <div className="mt-10 grid max-w-[900px] gap-5 sm:grid-cols-3">
          <div className="rounded-[24px] border border-white/10 bg-black/40 px-7 py-6 backdrop-blur-md shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
            <div className="text-[42px] font-black leading-none text-[#4ADE80]">
              5000+
            </div>
            <div className="mt-3 text-[15px] font-medium text-white/92">
              Sessions Delivered
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-black/40 px-7 py-6 backdrop-blur-md shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
            <div className="flex items-center gap-2 text-[42px] font-black leading-none text-[#FACC15]">
              <span>4.9</span>
              <Star className="h-8 w-8 fill-[#FACC15] text-[#FACC15]" />
            </div>
            <div className="mt-3 text-[15px] font-medium text-white/92">
              Rated by Pet Parents
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-black/40 px-7 py-6 backdrop-blur-md shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
            <div className="bg-gradient-to-r from-[#ff8a5b] to-[#ff5ea8] bg-clip-text text-[38px] font-black leading-none whitespace-nowrap text-transparent">
              In-House
            </div>
            <div className="mt-3 text-[15px] font-medium text-white/92">
              Teams Only
            </div>
          </div>
        </div>
      </div>

      <div className="relative justify-self-end">
        <div className="relative rounded-[28px] border border-white/15 bg-white p-7 shadow-[0_28px_80px_rgba(0,0,0,0.28)]">
          <div className="absolute right-6 top-5">
            <Image
              src="/images/heropup.png"
              alt="Cute pet icon"
              width={30}
              height={30}
              className="object-contain"
            />
          </div>

          <div className="pr-16">
            <p className="text-[14px] font-semibold text-[#6d5bd0]">
              Book A Consultation
            </p>

            <h3 className="mt-2 text-[26px] font-bold leading-tight text-[#1f1f2c]">
              Check Available Slot
            </h3>

            <p className="mt-3 max-w-[340px] text-[15px] leading-[1.6] text-[#6b7280]">
              Your Pet&apos;s Manager will be in touch with you shortly to help
              you book.
            </p>
          </div>

          <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              name="name"
              value={heroForm.name}
              onChange={handleHeroInputChange}
              placeholder="Name"
              className="h-[48px] rounded-[14px] border border-[#d9dbe7] bg-[#fcfcff] px-4 text-[15px] outline-none focus:border-[#9c8cff]"
            />
            <input
              name="phone"
              type="tel"
              value={heroForm.phone}
              onChange={handleHeroInputChange}
              placeholder="Phone Number"
              className="h-[48px] rounded-[14px] border border-[#d9dbe7] bg-[#fcfcff] px-4 text-[15px] outline-none focus:border-[#9c8cff]"
            />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <select
              name="city"
              value={heroForm.city}
              onChange={handleHeroInputChange}
              className="h-[48px] w-full rounded-[14px] border border-[#d9dbe7] bg-[#fcfcff] px-4 text-[15px] text-[#2a2346] outline-none focus:border-[#9c8cff]"
            >
              <option value="" disabled>
                Select city
              </option>
              {SUPPORTED_CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>

            <input
              name="requiredDate"
              type="date"
              value={heroForm.requiredDate}
              onChange={handleHeroInputChange}
              className="h-[48px] rounded-[14px] border border-[#d9dbe7] bg-[#fcfcff] px-4 text-[15px] text-[#6b7280] outline-none focus:border-[#9c8cff]"
            />
          </div>

          <select
            name="service"
            value={heroForm.service}
            onChange={handleHeroInputChange}
            className="mt-3 h-[48px] w-full rounded-[14px] border border-[#d9dbe7] bg-[#fcfcff] px-4 text-[15px] text-[#2a2346] outline-none focus:border-[#9c8cff]"
          >
            <optgroup label="Individual Sessions">
              {SERVICE_OPTIONS.filter(
                (service) => service.category === "Individual Sessions"
              )
                .sort((a, b) => a.order - b.order)
                .map((service) => (
                  <option key={service.name} value={service.name}>
                    {getServiceLabel(service.name)}
                  </option>
                ))}
            </optgroup>

            <optgroup label="Coat Care Plans">
              {SERVICE_OPTIONS.filter(
                (service) => service.category === "Coat Care Plans"
              )
                .sort((a, b) => a.order - b.order)
                .map((service) => (
                  <option key={service.name} value={service.name}>
                    {getServiceLabel(service.name)}
                  </option>
                ))}
            </optgroup>
          </select>

          <div className="mt-3 rounded-[14px] border border-[#ece5ff] bg-[#faf8ff] px-4 py-3">
            <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#8b90a0]">
              Selected Service
            </div>
            <div className="mt-1 flex items-center justify-between gap-3">
              <span className="text-[15px] font-semibold text-[#2a2346]">
                {getSelectedService().name}
              </span>
              <span className="text-[16px] font-black text-[#6d5bd0]">
                ₹{getSelectedService().price}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleCheckAvailability(false)}
            disabled={slotsLoading}
            className="mt-5 h-[52px] w-full rounded-[14px] bg-[#6d5bd0] text-[17px] font-semibold text-white shadow-[0_14px_30px_rgba(109,91,208,0.25)] transition hover:bg-[#5f4fc2] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {slotsLoading ? "Checking..." : "Check Availability"}
          </button>

          {slotsError ? (
            <p className="mt-3 text-[14px] text-red-500">{slotsError}</p>
          ) : null}

          {slotsMessage ? (
            <p className="mt-3 text-[14px] text-[#119b73]">{slotsMessage}</p>
          ) : null}
        </div>
      </div>
    </div>
  </div>
</section>

{/* BOOKING CONTINUATION CARD — MOBILE ONLY */}
<div className="lg:hidden relative z-10 -mt-8 px-4 pb-6">
  <div className="mx-auto max-w-[420px] rounded-[28px] border border-[#ebe3ff] bg-[linear-gradient(180deg,#f9f6ff_0%,#ffffff_100%)] p-5 shadow-[0_20px_60px_rgba(73,44,120,0.10)]">
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a5ce0]">At-home grooming</p>
    <h3 className="mt-2 max-w-[280px] text-[34px] font-black leading-[0.98] tracking-[-0.03em] text-[#2a2346]">
      Check session availability
    </h3>
    <p className="mt-2 text-[16px] font-medium text-[#8474c4]">Starting at ₹999</p>
    <button
      type="button"
      onClick={openBookingFlow}
      className="mt-[18px] flex w-full h-[52px] items-center justify-center rounded-[18px] bg-[#6d5bd0] text-[16px] font-semibold text-white shadow-[0_10px_28px_rgba(109,91,208,0.22)] transition active:scale-[0.98]"
    >
      Check Availability
    </button>
    <p className="mt-2.5 text-center text-[13px] leading-[1.55] text-[#9ca3af]">
      Choose your city, date, and service in the next step.
    </p>
  </div>
</div>

     {/* MOBILE SECTION ORDER WRAPPER — flex-col on mobile reorders sections; lg:block restores normal DOM flow */}
<div className="flex flex-col lg:block">

     {/* TRUST CARE SECTION */}
<section
  id="why-trust-us-section"
  className="order-2 lg:order-none relative overflow-hidden bg-[#fcfaff] pt-9 pb-10 sm:py-[88px] lg:py-[120px]"
>
  <div className="pointer-events-none absolute inset-0">
    <div className="absolute left-[-120px] top-[140px] h-[320px] w-[320px] rounded-full bg-[#efe7ff] blur-[90px]" />
    <div className="absolute right-[-100px] top-[420px] h-[300px] w-[300px] rounded-full bg-[#f7dfff] blur-[100px]" />
    <div className="absolute bottom-[120px] left-[15%] h-[220px] w-[220px] rounded-full bg-[#f1ecff] blur-[80px]" />
  </div>

  {/* =========================
      MOBILE: TRUST CAROUSEL
  ========================= */}
  <div className="relative z-10 mx-auto max-w-[1240px] px-4 sm:px-6 lg:hidden">
    <div className="mx-auto max-w-[720px] text-center">
      <div className="inline-flex rounded-full border border-[#e8ddff] bg-white/95 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7a5ce0] shadow-[0_8px_20px_rgba(122,92,224,0.07)]">
        Why Pet Parents Trust Us
      </div>

      <h2 className="mt-3 text-[26px] font-black leading-[1.02] tracking-[-0.04em] text-[#2a2346] sm:mt-5 sm:text-[40px]">
        Where grooming
        <br />
        feels like love
      </h2>

      <p className="mx-auto mt-2 max-w-[300px] text-[13px] leading-[1.65] text-[#6b7280] sm:mt-4 sm:max-w-[430px] sm:text-[16px]">
        Calm handling, skilled groomers, and premium products — all built around your pet.
      </p>
    </div>

    <div
      ref={trustCarouselRef}
      onScroll={handleTrustCarouselScroll}
      className="mt-3 -mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div className="flex snap-x snap-mandatory gap-3.5 pr-4">
        {/* MOBILE SLIDE 1 */}
        <div data-carousel-slide="true" className="w-[85%] max-w-[320px] shrink-0 snap-start rounded-[26px] border border-[#eee7ff] bg-white/95 p-4 shadow-[0_18px_40px_rgba(77,47,122,0.08)] backdrop-blur-sm">
          <div className="relative h-[156px] w-full overflow-hidden rounded-[18px] border border-[#ececec] bg-[linear-gradient(135deg,#eef1f4_0%,#f7f8fb_100%)]">
            <Image
              src="/images/trust-image-1.jpeg"
              alt="Gentle pet-first grooming"
              fill
              className="object-cover object-[40%_68%]"
            />
          </div>

          <div className="mt-3 inline-flex rounded-full bg-[#f4eeff] px-3 py-1.5 text-[12px] font-semibold text-[#7154d8]">
            🐾 Pet-First Approach
          </div>

          <h3 className="mt-2 text-[20px] font-black leading-[1.1] tracking-[-0.03em] text-[#2a2346]">
            Because your pet comes{" "}
            <span className="bg-gradient-to-r from-[#7a5ce0] to-[#a78bfa] bg-clip-text text-transparent">
              first
            </span>
            .
          </h3>

          <p className="mt-2 text-[13px] leading-[1.65] text-[#5f6673]">
            We take it slow, read their cues, and ease them in so every session feels safe and calm.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-3 py-1.5 text-[11px] font-medium text-[#5f6673]">
              Anxiety-aware handling
            </span>
            <span className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-3 py-1.5 text-[11px] font-medium text-[#5f6673]">
              Gentle introductions
            </span>
          </div>
        </div>

        {/* MOBILE SLIDE 2 */}
        <div data-carousel-slide="true" className="w-[85%] max-w-[320px] shrink-0 snap-start rounded-[26px] border border-[#eee7ff] bg-white/95 p-4 shadow-[0_18px_40px_rgba(77,47,122,0.08)] backdrop-blur-sm">
          <div className="relative h-[156px] w-full overflow-hidden rounded-[18px] border border-[#ececec] bg-[linear-gradient(135deg,#eef1f4_0%,#f7f8fb_100%)]">
            <Image
              src="/images/trust-image-2.jpeg"
              alt="Professional groomer at work"
              fill
              className="object-cover object-center"
            />
          </div>

          <div className="mt-3 inline-flex rounded-full bg-[#f4eeff] px-3 py-1.5 text-[12px] font-semibold text-[#7154d8]">
            ⭐ Star Groomers
          </div>

          <h3 className="mt-2 text-[20px] font-black leading-[1.1] tracking-[-0.03em] text-[#2a2346]">
            Only the{" "}
            <span className="bg-gradient-to-r from-[#22b8a9] to-[#7dd3c7] bg-clip-text text-transparent">
              pros
            </span>{" "}
            touch your pet.
          </h3>

          <p className="mt-2 text-[13px] leading-[1.65] text-[#5f6673]">
            Experienced groomers bring breed-aware styling and a calm, precise hand to every session.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-3 py-1.5 text-[11px] font-medium text-[#5f6673]">
              10+ years experience
            </span>
            <span className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-3 py-1.5 text-[11px] font-medium text-[#5f6673]">
              Breed-aware styling
            </span>
          </div>
        </div>

        {/* MOBILE SLIDE 3 */}
        <div data-carousel-slide="true" className="w-[85%] max-w-[320px] shrink-0 snap-start rounded-[26px] border border-[#eee7ff] bg-white/95 p-4 shadow-[0_18px_40px_rgba(77,47,122,0.08)] backdrop-blur-sm">
          <div className="relative h-[156px] w-full overflow-hidden rounded-[18px] border border-[#ececec] bg-[linear-gradient(135deg,#eef1f4_0%,#f7f8fb_100%)]">
            <Image
              src="/images/trust-image-3.jpeg"
              alt="Premium grooming products"
              fill
              className="object-cover object-[78%_center]"
            />
          </div>

          <div className="mt-3 inline-flex rounded-full bg-[#f4eeff] px-3 py-1.5 text-[12px] font-semibold text-[#7154d8]">
            🧴 Highest Quality Products
          </div>

          <h3 className="mt-2 text-[20px] font-black leading-[1.1] tracking-[-0.03em] text-[#2a2346]">
            Nothing but the{" "}
            <span className="bg-gradient-to-r from-[#f4a940] to-[#ffd166] bg-clip-text text-transparent">
              best
            </span>{" "}
            for their coat.
          </h3>

          <p className="mt-2 text-[13px] leading-[1.65] text-[#5f6673]">
            We use breed-specific, vet-approved products selected for coat health, comfort, and safe grooming.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-3 py-1.5 text-[11px] font-medium text-[#5f6673]">
              Vet-approved products
            </span>
            <span className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-3 py-1.5 text-[11px] font-medium text-[#5f6673]">
              Breed-specific care
            </span>
          </div>
        </div>

        {/* MOBILE SLIDE 4 */}
        <div data-carousel-slide="true" className="w-[85%] max-w-[320px] shrink-0 snap-start rounded-[26px] border border-[#eee7ff] bg-white/95 p-4 shadow-[0_18px_40px_rgba(77,47,122,0.08)] backdrop-blur-sm">
          <div className="relative h-[156px] w-full overflow-hidden rounded-[18px] border border-[#ececec] bg-[linear-gradient(135deg,#eef1f4_0%,#f7f8fb_100%)]">
            <Image
              src="/images/trust-image-4.jpeg"
              alt="Style preview grooming"
              fill
              className="object-cover object-[30%_center]"
            />
          </div>

          <div className="mt-3 inline-flex rounded-full bg-[#f4eeff] px-3 py-1.5 text-[12px] font-semibold text-[#7154d8]">
            ✨ Style Preview
          </div>

          <h3 className="mt-2 text-[20px] font-black leading-[1.1] tracking-[-0.03em] text-[#2a2346]">
            See the{" "}
            <span className="bg-gradient-to-r from-[#ff5ea8] to-[#ffb15c] bg-clip-text text-transparent">
              glow-up
            </span>{" "}
            before it happens.
          </h3>

          <p className="mt-2 text-[13px] leading-[1.65] text-[#5f6673]">
            We preview your pet’s style so expectations feel aligned before the final look.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-3 py-1.5 text-[11px] font-medium text-[#5f6673]">
              Visual planning
            </span>
            <span className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-3 py-1.5 text-[11px] font-medium text-[#5f6673]">
              Clear expectations
            </span>
          </div>
        </div>
      </div>
    </div>

    <div className="mt-3 flex flex-col items-center gap-1">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2, 3].map((index) => (
          <span
            key={index}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              activeTrustSlide === index
                ? "w-5 bg-[#6d5bd0]"
                : "w-1.5 bg-[#d8cff8]"
            }`}
          />
        ))}
      </div>
      <div className="text-[9px] font-medium tracking-[0.05em] text-[#b8bcc8]">
        Swipe to explore
      </div>
    </div>
  </div>

  {/* =========================
      DESKTOP: RICH SHOWCASE
  ========================= */}
  <div className="relative z-10 mx-auto hidden max-w-[1240px] px-6 lg:block">
    <div className="mx-auto max-w-[780px] text-center">
      <div className="inline-flex rounded-full border border-[#e8ddff] bg-white px-5 py-2.5 text-[13px] font-semibold uppercase tracking-[0.22em] text-[#7a5ce0] shadow-[0_8px_20px_rgba(122,92,224,0.08)]">
        Why Pet Parents Trust Us
      </div>

      <h2 className="mt-7 text-[42px] font-black leading-[1.08] text-[#2a2346] md:text-[54px]">
        Where Grooming Feels Like Love
      </h2>

      <p className="mx-auto mt-6 max-w-[760px] text-[18px] leading-[1.85] text-[#6b7280]">
        From the moment your pet meets us to the final look they walk away
        with, every step is designed to feel calm, safe, and genuinely caring.
      </p>
    </div>

    {/* CARD 1 */}
    <div className="group/card relative mt-16 rounded-[34px] border border-[#efe9ff] bg-white/92 p-7 shadow-[0_28px_80px_rgba(77,47,122,0.09)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 hover:scale-[1.01] hover:shadow-[0_36px_90px_rgba(77,47,122,0.13)] md:p-9">
      <div className="pointer-events-none absolute inset-0 rounded-[34px] bg-gradient-to-r from-[#f8f4ff] to-[#ffffff] opacity-0 transition-opacity duration-300 group-hover/card:opacity-100" />

      <div className="relative z-10 grid items-center gap-10 md:grid-cols-2 md:gap-14">
        <div className="order-2 md:order-1">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#efe7ff] text-[13px] font-bold text-[#6d4cff]">
              01
            </div>
            <div className="h-[1px] w-10 bg-[#e5dbff]" />
          </div>

          <div className="inline-flex rounded-full bg-[#f4eeff] px-4 py-2 text-[14px] font-semibold text-[#7154d8]">
            🐾 Pet-First Approach
          </div>

          <h3 className="mt-5 text-[30px] font-black leading-[1.12] tracking-[-0.3px] text-[#2a2346] md:text-[34px]">
            Because your pet comes{" "}
            <span className="bg-gradient-to-r from-[#7a5ce0] to-[#a78bfa] bg-clip-text text-transparent">
              first
            </span>
            . Always.
          </h3>

          <p className="mt-5 max-w-[500px] text-[17px] leading-[1.85] text-[#5f6673]">
            We take it slow, read their cues, and ease them in—so every
            grooming session feels safe, calm, and stress-free.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <span className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-4 py-2.5 text-[13px] font-medium text-[#5f6673] shadow-sm">
              Anxiety-aware handling
            </span>
            <span className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-4 py-2.5 text-[13px] font-medium text-[#5f6673] shadow-sm">
              Gentle introductions
            </span>
            <span className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-4 py-2.5 text-[13px] font-medium text-[#5f6673] shadow-sm">
              Calm, reassuring care
            </span>
          </div>
        </div>

        <div className="order-1 md:order-2">
          <div className="relative h-[320px] w-full overflow-hidden rounded-[30px] border border-[#ececec] bg-[linear-gradient(135deg,#eef1f4_0%,#f7f8fb_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition-all duration-500 group-hover/card:scale-[1.03] group-hover/card:shadow-[0_16px_30px_rgba(77,47,122,0.08)] md:h-[340px]">
            <div className="absolute left-6 top-6 z-10 h-14 w-14 rounded-2xl bg-white/70 blur-md" />
            <div className="absolute bottom-6 right-6 z-10 h-20 w-20 rounded-full bg-[#ede3ff]/60 blur-2xl" />

            <Image
              src="/images/trust-image-1.jpeg"
              alt="Gentle pet-first grooming"
              fill
              className="object-cover object-[40%_68%]"
            />
          </div>
        </div>
      </div>
    </div>

    {/* CARD 2 */}
    <div className="group/card relative mt-10 rounded-[34px] border border-[#efe9ff] bg-white/92 p-7 shadow-[0_28px_80px_rgba(77,47,122,0.09)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 hover:scale-[1.01] hover:shadow-[0_36px_90px_rgba(77,47,122,0.13)] md:p-9">
      <div className="pointer-events-none absolute inset-0 rounded-[34px] bg-gradient-to-r from-[#f8f4ff] to-[#ffffff] opacity-0 transition-opacity duration-300 group-hover/card:opacity-100" />

      <div className="relative z-10 grid items-center gap-10 md:grid-cols-2 md:gap-14">
        <div>
          <div className="relative h-[320px] w-full overflow-hidden rounded-[30px] border border-[#ececec] bg-[linear-gradient(135deg,#eef1f4_0%,#f7f8fb_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition-all duration-500 group-hover/card:scale-[1.03] group-hover/card:shadow-[0_16px_30px_rgba(77,47,122,0.08)] md:h-[340px]">
            <div className="absolute left-6 top-6 z-10 h-14 w-14 rounded-2xl bg-white/70 blur-md" />
            <div className="absolute bottom-6 right-6 z-10 h-20 w-20 rounded-full bg-[#ede3ff]/60 blur-2xl" />

            <Image
              src="/images/trust-image-2.jpeg"
              alt="Professional groomer at work"
              fill
              className="object-cover object-center"
            />
          </div>
        </div>

        <div>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#efe7ff] text-[13px] font-bold text-[#6d4cff]">
              02
            </div>
            <div className="h-[1px] w-10 bg-[#e5dbff]" />
          </div>

          <div className="inline-flex rounded-full bg-[#f4eeff] px-4 py-2 text-[14px] font-semibold text-[#7154d8]">
            ⭐ Star Groomers
          </div>

          <h3 className="mt-5 text-[30px] font-black leading-[1.12] tracking-[-0.3px] text-[#2a2346] md:text-[34px]">
            Only the{" "}
            <span className="bg-gradient-to-r from-[#22b8a9] to-[#7dd3c7] bg-clip-text text-transparent">
              pros
            </span>{" "}
            touch your pet.
          </h3>

          <p className="mt-5 max-w-[500px] text-[17px] leading-[1.85] text-[#5f6673]">
            Our groomers bring 10+ years of experience—so whether it’s a tidy
            trim or a full makeover, your pet leaves looking and feeling
            amazing.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <span className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-4 py-2.5 text-[13px] font-medium text-[#5f6673] shadow-sm">
              10+ years experience
            </span>
            <span className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-4 py-2.5 text-[13px] font-medium text-[#5f6673] shadow-sm">
              Breed-aware styling
            </span>
            <span className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-4 py-2.5 text-[13px] font-medium text-[#5f6673] shadow-sm">
              Precision finishing
            </span>
          </div>
        </div>
      </div>
    </div>

    {/* CARD 3 */}
    <div className="group/card relative mt-10 rounded-[34px] border border-[#efe9ff] bg-white/92 p-7 shadow-[0_28px_80px_rgba(77,47,122,0.09)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 hover:scale-[1.01] hover:shadow-[0_36px_90px_rgba(77,47,122,0.13)] md:p-9">
      <div className="pointer-events-none absolute inset-0 rounded-[34px] bg-gradient-to-r from-[#f8f4ff] to-[#ffffff] opacity-0 transition-opacity duration-300 group-hover/card:opacity-100" />

      <div className="relative z-10 grid items-center gap-10 md:grid-cols-2 md:gap-14">
        <div className="order-2 md:order-1">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#efe7ff] text-[13px] font-bold text-[#6d4cff]">
              03
            </div>
            <div className="h-[1px] w-10 bg-[#e5dbff]" />
          </div>

          <div className="inline-flex rounded-full bg-[#f4eeff] px-4 py-2 text-[14px] font-semibold text-[#7154d8]">
            🧴 Highest Quality Products
          </div>

          <h3 className="mt-5 text-[30px] font-black leading-[1.12] tracking-[-0.3px] text-[#2a2346] md:text-[34px]">
            Nothing but the{" "}
            <span className="bg-gradient-to-r from-[#f4a940] to-[#ffd166] bg-clip-text text-transparent">
              best
            </span>{" "}
            for their coat.
          </h3>

          <p className="mt-5 max-w-[500px] text-[17px] leading-[1.85] text-[#5f6673]">
            We assess skin and coat type before every session, using
            breed-specific, vet-approved products tailored just for your pet.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <span className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-4 py-2.5 text-[13px] font-medium text-[#5f6673] shadow-sm">
              Skin &amp; coat assessment
            </span>
            <span className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-4 py-2.5 text-[13px] font-medium text-[#5f6673] shadow-sm">
              Vet-approved products
            </span>
            <span className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-4 py-2.5 text-[13px] font-medium text-[#5f6673] shadow-sm">
              Breed-specific care
            </span>
          </div>
        </div>

        <div className="order-1 md:order-2">
          <div className="relative h-[320px] w-full overflow-hidden rounded-[30px] border border-[#ececec] bg-[linear-gradient(135deg,#eef1f4_0%,#f7f8fb_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition-all duration-500 group-hover/card:scale-[1.03] group-hover/card:shadow-[0_16px_30px_rgba(77,47,122,0.08)] md:h-[340px]">
            <div className="absolute left-6 top-6 z-10 h-14 w-14 rounded-2xl bg-white/70 blur-md" />
            <div className="absolute bottom-6 right-6 z-10 h-20 w-20 rounded-full bg-[#ede3ff]/60 blur-2xl" />

            <Image
              src="/images/trust-image-3.jpeg"
              alt="Premium grooming products"
              fill
              className="object-cover object-[78%_center]"
            />
          </div>
        </div>
      </div>
    </div>

    {/* CARD 4 */}
    <div className="group/card relative mt-10 rounded-[34px] border border-[#efe9ff] bg-white/92 p-7 shadow-[0_28px_80px_rgba(77,47,122,0.09)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 hover:scale-[1.01] hover:shadow-[0_36px_90px_rgba(77,47,122,0.13)] md:p-9">
      <div className="pointer-events-none absolute inset-0 rounded-[34px] bg-gradient-to-r from-[#f8f4ff] to-[#ffffff] opacity-0 transition-opacity duration-300 group-hover/card:opacity-100" />

      <div className="relative z-10 grid items-center gap-10 md:grid-cols-2 md:gap-14">
        <div>
          <div className="relative h-[320px] w-full overflow-hidden rounded-[30px] border border-[#ececec] bg-[linear-gradient(135deg,#eef1f4_0%,#f7f8fb_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition-all duration-500 group-hover/card:scale-[1.03] group-hover/card:shadow-[0_16px_30px_rgba(77,47,122,0.08)] md:h-[340px]">
            <div className="absolute left-6 top-6 z-10 h-14 w-14 rounded-2xl bg-white/70 blur-md" />
            <div className="absolute bottom-6 right-6 z-10 h-20 w-20 rounded-full bg-[#ede3ff]/60 blur-2xl" />

            <Image
              src="/images/trust-image-4.jpeg"
              alt="Style preview grooming"
              fill
              className="object-cover object-[30%_center]"
            />
          </div>
        </div>

        <div>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#efe7ff] text-[13px] font-bold text-[#6d4cff]">
              04
            </div>
            <div className="h-[1px] w-10 bg-[#e5dbff]" />
          </div>

          <div className="inline-flex rounded-full bg-[#f4eeff] px-4 py-2 text-[14px] font-semibold text-[#7154d8]">
            ✨ Style Preview
          </div>

          <h3 className="mt-5 text-[30px] font-black leading-[1.12] tracking-[-0.3px] text-[#2a2346] md:text-[34px]">
            See the{" "}
            <span className="bg-gradient-to-r from-[#ff5ea8] to-[#ffb15c] bg-clip-text text-transparent">
              glow-up
            </span>{" "}
            before it happens.
          </h3>

          <p className="mt-5 max-w-[500px] text-[17px] leading-[1.85] text-[#5f6673]">
            Get a visual preview of your pet’s hairstyle—so you know exactly
            how fabulous they’re about to look.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <span className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-4 py-2.5 text-[13px] font-medium text-[#5f6673] shadow-sm">
              Visual style planning
            </span>
            <span className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-4 py-2.5 text-[13px] font-medium text-[#5f6673] shadow-sm">
              Clear expectations
            </span>
            <span className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-4 py-2.5 text-[13px] font-medium text-[#5f6673] shadow-sm">
              Confident booking
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
      {/* SESSIONS / COAT CARE PLANS SECTION */}
<section id="packages-section" className="order-1 lg:order-none relative overflow-hidden bg-white py-12 sm:py-[88px] lg:py-[120px]">
  <div className="pointer-events-none absolute inset-0">
    <div className="absolute left-[-140px] top-[80px] h-[280px] w-[280px] rounded-full bg-[#f3ecff] blur-[95px]" />
    <div className="absolute right-[-120px] top-[220px] h-[260px] w-[260px] rounded-full bg-[#fff1e6] blur-[95px]" />
    <div className="absolute bottom-[40px] left-[35%] h-[220px] w-[220px] rounded-full bg-[#eefcf8] blur-[90px]" />
  </div>

  <div className="relative z-10 mx-auto max-w-[1260px] px-4 sm:px-6">
    <div className="mx-auto max-w-[720px] text-center">
  <div className="inline-flex rounded-full border border-[#e8ddff] bg-white/95 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7a5ce0] shadow-[0_8px_18px_rgba(122,92,224,0.07)] sm:px-5 sm:py-2.5 sm:text-[13px]">
    {packageView === "sessions" ? "Choose Your Session" : "Coat Care Plans"}
  </div>

  <h2 className="mt-4 text-[26px] font-black leading-[1.08] tracking-[-0.03em] text-[#2a2346] sm:mt-5 sm:text-[38px] lg:text-[58px] lg:leading-[1.04] lg:tracking-[-0.04em]">
    {packageView === "sessions" ? (
      <>Individual Grooming Sessions</>
    ) : (
      <>Better Care Through Consistency</>
    )}
  </h2>

  <p className="mx-auto mt-3 max-w-[300px] text-[13px] leading-[1.7] text-[#6b7280] sm:max-w-[620px] sm:text-[18px]">
    {packageView === "sessions"
      ? "Premium one-time sessions tailored to your pet’s coat."
      : "Structured multi-session care for healthier coats over time."}
  </p>
  {packageView === "sessions" ? (
    <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#e8ddff] bg-[#f9f7ff] px-4 py-2 text-[12px] font-semibold text-[#6d5bd0] sm:text-[13px]">
      <span>🎁</span>
      <span>Book 4, get your 5th free — no catch</span>
    </div>
  ) : null}
</div>

<div className="mt-6 flex flex-col items-center gap-2.5 sm:mt-8">
  <div className="inline-flex w-full max-w-[560px] rounded-[18px] border border-[#ece7f8] bg-white/96 p-1 shadow-[0_10px_24px_rgba(70,44,120,0.04)]">
    <button
      type="button"
      onClick={() => setPackageView("sessions")}
      className={`flex-1 rounded-[14px] px-3 py-2.5 text-[13px] font-semibold transition sm:px-6 sm:py-3 sm:text-[15px] ${
        packageView === "sessions"
          ? "bg-[#6d5bd0] text-white shadow-[0_6px_14px_rgba(109,91,208,0.22)]"
          : "text-[#757b89] hover:text-[#4a3ca0]"
      }`}
    >
      Individual Sessions
    </button>

    <button
      type="button"
      onClick={() => setPackageView("plans")}
      className={`flex-1 rounded-[14px] px-3 py-2.5 text-[13px] font-semibold transition sm:px-6 sm:py-3 sm:text-[15px] ${
        packageView === "plans"
          ? "bg-[#6d5bd0] text-white shadow-[0_6px_14px_rgba(109,91,208,0.22)]"
          : "text-[#757b89] hover:text-[#4a3ca0]"
      }`}
    >
      Coat Care Plans
    </button>
  </div>
  <p className="text-[11px] font-medium text-[#a0a5b3]">
    {packageView === "sessions" ? "One-time visits" : "Multi-session care"}
  </p>
</div>

    <AnimatePresence mode="wait">
      {packageView === "sessions" ? (
        <motion.div
          key="sessions"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          {/* MOBILE SESSIONS */}
<div className="mt-6 lg:hidden">
  <div
    ref={sessionCarouselRef}
    onScroll={handleSessionCarouselScroll}
    className="-mx-4 overflow-x-auto px-4 pt-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
  >
    <div className="flex snap-x snap-mandatory items-stretch gap-3.5 pr-4">
      {PACKAGES.map((pkg) => (
        <div
          key={pkg.name}
          data-carousel-slide="true"
          className={`relative flex w-[85%] max-w-[340px] shrink-0 snap-start flex-col rounded-[28px] border p-5 pt-10 ${pkg.cardBorder} ${pkg.cardBg} ${pkg.cardShadow}`}
        >
          {/* badge */}
          <div className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2 h-[28px] flex items-center">
            {pkg.badge ? (
              <div className={`rounded-full border border-white/30 px-4 py-1.5 text-[11px] font-semibold whitespace-nowrap text-white ${pkg.badgeBg} ${pkg.badgeShadow}`}>
                {pkg.badge}
              </div>
            ) : null}
          </div>

          {/* label + icon */}
<div className="flex min-h-[44px] items-start justify-between gap-3">
  <div className={`inline-flex min-h-[36px] items-center rounded-full px-3 py-1.5 text-[12px] font-semibold ${pkg.pillBg} ${pkg.pillText}`}>
    {pkg.name}
  </div>
  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-[17px] ${pkg.iconBg}`}>
    {pkg.icon}
  </div>
</div>

          {/* price */}
          <div className={`mt-3 text-[32px] font-black leading-none ${pkg.priceCls}`}>
            ₹{pkg.price}
          </div>

          {/* best-for */}
          <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9da3b0]">
            {pkg.bestFor}
          </p>

          {/* outcome summary */}
          <p className="mt-2 max-w-[28ch] text-[12.5px] leading-[1.65] text-[#5b6070]">
  {pkg.summary}
</p>

          <div className={`mt-[18px] mb-[18px] h-px w-full ${pkg.divider}`} />

{/* CTA + secondary action */}
<div className="mt-auto flex flex-col">
  <button
    type="button"
    onClick={() => handlePackageBookNow(pkg.name)}
    className={`flex h-[50px] w-full items-center justify-center rounded-[18px] text-[15px] font-semibold leading-none transition ${pkg.btnCls}`}
  >
    <span className="leading-none">Book Now</span>
  </button>

  <button
    type="button"
    onClick={() => openInclusions(pkg.name)}
    className="mt-[14px] w-full text-center text-[14px] font-medium leading-[1.2] text-[#8d84b8] underline underline-offset-[3px] decoration-[#d8d0f0] transition hover:text-[#6d5bd0]"
  >
    View full inclusions
  </button>
</div>
        </div>
      ))}
    </div>
  </div>

  <div className="mt-2 flex items-center justify-center">
    <div className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 shadow-[0_8px_18px_rgba(70,44,120,0.04)]">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            activeSessionSlide === index ? "w-5 bg-[#6d5bd0]" : "w-1.5 bg-[#d8cff8]"
          }`}
        />
      ))}
    </div>
  </div>

  <div id="add-ons-section" className="mx-auto mt-5 max-w-[560px] rounded-[20px] border border-[#ece5ff] bg-white p-4 shadow-[0_8px_20px_rgba(109,91,208,0.04)]">
    <div className="text-[13px] font-bold text-[#2a2346]">Optional add-ons</div>
    <p className="mt-0.5 text-[11px] leading-[1.7] text-[#8b90a0]">Available during booking</p>
    <div className="mt-3 flex flex-wrap gap-2">
      {["Anti-Tick Protection", "Gland Cleaning", "Deworming"].map((addon) => (
        <span key={addon} className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-3 py-1.5 text-[12px] font-medium text-[#5f6673]">
          {addon}
        </span>
      ))}
    </div>
  </div>
</div>

          {/* DESKTOP SESSIONS */}
          <div className="mt-16 hidden gap-8 lg:grid lg:grid-cols-3">
            {[...PACKAGES].reverse().map((pkg) => (
            <div
              key={pkg.name}
              className={`relative flex h-full flex-col rounded-[30px] border p-8 pt-10 transition-all duration-300 hover:-translate-y-2 ${pkg.cardBorder} ${pkg.cardBg} ${pkg.cardShadow} hover:shadow-[0_30px_80px_rgba(0,0,0,0.10)]`}
            >
              {pkg.badge && (
                <div className="pointer-events-none absolute -top-5 left-1/2 z-20 -translate-x-1/2">
                  <div className={`rounded-full border border-white/30 px-5 py-2 text-[12px] font-semibold leading-none whitespace-nowrap text-white backdrop-blur-md ${pkg.badgeBg} ${pkg.badgeShadow}`}>
                    {pkg.badge}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-[1fr_56px] items-start gap-5 pt-2">
                <div className="min-w-0">
                  <div className={`inline-flex whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-semibold ${pkg.pillBg} ${pkg.pillText}`}>
                    {pkg.name}
                  </div>
                  <div className={`mt-5 text-[40px] font-black leading-none ${pkg.priceCls}`}>
                    ₹{pkg.price}
                  </div>
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9da3b0]">
                    {pkg.bestFor}
                  </p>
                  <p className="mt-3 max-w-[320px] text-[15px] leading-[1.75] text-[#6b7280]">
                    {pkg.summary}
                  </p>
                </div>
                <div className={`mt-[18px] flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-[24px] shadow-sm ${pkg.iconBg}`}>
                  {pkg.icon}
                </div>
              </div>

              <div className={`mt-7 h-px w-full ${pkg.divider}`} />

              <div className="mt-auto pt-8 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => handlePackageBookNow(pkg.name)}
                  className={`flex h-[56px] w-full items-center justify-center rounded-[20px] text-[16px] font-semibold transition ${pkg.desktopBtnCls}`}
                >
                  Book Now
                </button>
                <button
                  type="button"
                  onClick={() => openInclusions(pkg.name)}
                  className="w-full text-center text-[13px] font-medium text-[#9a94b8] underline underline-offset-2 decoration-[#d8d0f0]"
                >
                  View full inclusions
                </button>
              </div>
            </div>
            ))}
          </div>

          <div className="mt-16 hidden flex-col items-center justify-center gap-5 text-center lg:flex">
            <div className="text-[15px] font-medium text-[#6b7280]">
              Optional add-ons available
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-4 py-2 text-[14px] font-medium text-[#4b4370] shadow-sm">
                Anti-Tick Protection
              </span>
              <span className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-4 py-2 text-[14px] font-medium text-[#4b4370] shadow-sm">
                Gland Cleaning
              </span>
              <span className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-4 py-2 text-[14px] font-medium text-[#4b4370] shadow-sm">
                Deworming
              </span>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="plans"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          {/* MOBILE PLANS */}
<div className="mt-6 lg:hidden">
  <div
    ref={plansCarouselRef}
    onScroll={handlePlansCarouselScroll}
    className="-mx-4 overflow-x-auto px-4 pt-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
  >
    <div className="flex snap-x snap-mandatory items-stretch gap-3.5 pr-4">
      {/* CARE PLAN — center, most recommended */}
      <div
        data-carousel-slide="true"
        className="relative flex w-[85%] max-w-[340px] shrink-0 snap-start flex-col rounded-[28px] border border-[#ddd3ff] bg-[linear-gradient(180deg,#fdfcff_0%,#f8f5ff_100%)] p-5 pt-10 shadow-[0_20px_52px_rgba(109,91,208,0.11)]"
      >
        <div className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2">
          <div className="rounded-full border border-white/30 bg-[#6d5bd0]/90 px-4 py-1.5 text-[11px] font-semibold whitespace-nowrap text-white shadow-[0_8px_18px_rgba(109,91,208,0.14)]">
            Most Recommended
          </div>
        </div>

        <div className="flex min-h-[44px] items-start justify-between gap-3">
          <div className="inline-flex min-h-[36px] items-center rounded-full bg-[#f4efff] px-3 py-1.5 text-[12px] font-semibold text-[#6d5bd0]">
            Care Plan
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#f5f1ff] text-[17px]">
            ✂️
          </div>
        </div>

        <div className="mt-3 text-[32px] font-black leading-none text-[#2a2346]">₹6999</div>
        <div className="mt-1 text-[12px] font-semibold text-[#6d5bd0]">6 Sessions</div>

        <p className="mt-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#8f98aa]">
          Best for consistent upkeep.
        </p>

        <p className="mt-3 max-w-[30ch] text-[14px] leading-[1.65] text-[#626b7f]">
          A structured maintenance plan for pets who need regular coat care,
          better continuity, and ongoing monitoring across grooming cycles.
        </p>

        <div className="mt-[18px] mb-[18px] h-px w-full bg-[#eee9ff]" />

        <div className="mt-auto flex flex-col">
          <button
            type="button"
            onClick={() => handlePackageBookNow("Care Plan")}
            className="flex h-[50px] w-full items-center justify-center rounded-[18px] bg-[#6d5bd0] text-[15px] font-semibold leading-none text-white shadow-[0_8px_18px_rgba(109,91,208,0.16)] transition hover:bg-[#5f4fc2]"
          >
            <span className="leading-none">Start Care Plan</span>
          </button>

         <button
  type="button"
  onClick={() => openPlanDetails("Care Plan")}
  className="mt-[14px] w-full text-center text-[14px] font-medium leading-[1.2] text-[#8d84b8] underline underline-offset-[3px] decoration-[#d8d0f0] transition hover:text-[#6d5bd0]"
>
  See plan details
</button>
        </div>
      </div>

      {/* WELLNESS PLAN */}
      <div
        data-carousel-slide="true"
        className="relative flex w-[85%] max-w-[340px] shrink-0 snap-start flex-col rounded-[28px] border border-[#f6d9c0] bg-[linear-gradient(180deg,#fffdfa_0%,#fff7f1_100%)] p-5 pt-10 shadow-[0_18px_48px_rgba(234,88,12,0.09)]"
      >
        <div className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2">
          <div className="rounded-full border border-white/30 bg-[#f97316]/90 px-4 py-1.5 text-[11px] font-semibold whitespace-nowrap text-white shadow-[0_8px_18px_rgba(255,145,92,0.18)]">
            Best Value
          </div>
        </div>

        <div className="flex min-h-[44px] items-start justify-between gap-3">
          <div className="inline-flex min-h-[36px] items-center rounded-full bg-[#fff4ec] px-3 py-1.5 text-[12px] font-semibold text-[#ea580c]">
            Wellness Plan
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#fff4ec] text-[17px]">
            ✨
          </div>
        </div>

        <div className="mt-3 bg-gradient-to-r from-[#ff8a5b] to-[#ffb15c] bg-clip-text text-[32px] font-black leading-none text-transparent">
          ₹14999
        </div>
        <div className="mt-1 text-[12px] font-semibold text-[#ea580c]">12 Sessions</div>

        <p className="mt-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#8f98aa]">
          Best for long-term coat health.
        </p>

        <p className="mt-3 max-w-[30ch] text-[14px] leading-[1.65] text-[#626b7f]">
          Our best-value long-term plan for pets that benefit from year-round
          upkeep, extended coat care, and more consistent results.
        </p>

        <div className="mt-[18px] mb-[18px] h-px w-full bg-[#f8e1d0]" />

        <div className="mt-auto flex flex-col">
          <button
            type="button"
            onClick={() => handlePackageBookNow("Wellness Plan")}
            className="flex h-[50px] w-full items-center justify-center rounded-[18px] bg-gradient-to-r from-[#ff8a5b] to-[#ffb15c] text-[15px] font-semibold leading-none text-white shadow-[0_8px_18px_rgba(255,145,92,0.18)] transition hover:brightness-[0.98]"
          >
            <span className="leading-none">Choose Wellness Plan</span>
          </button>

          <button
  type="button"
  onClick={() => openPlanDetails("Wellness Plan")}
  className="mt-[14px] w-full text-center text-[14px] font-medium leading-[1.2] text-[#8d84b8] underline underline-offset-[3px] decoration-[#d8d0f0] transition hover:text-[#6d5bd0]"
>
  See plan details
</button>
        </div>
      </div>

      {/* STARTER PLAN */}
      <div
        data-carousel-slide="true"
        className="relative flex w-[85%] max-w-[340px] shrink-0 snap-start flex-col rounded-[28px] border border-[#e6eef0] bg-white p-5 shadow-[0_12px_34px_rgba(0,0,0,0.04)]"
      >
        <div className="flex min-h-[44px] items-start justify-between gap-3">
          <div className="inline-flex min-h-[36px] items-center rounded-full bg-[#eafbf5] px-3 py-1.5 text-[12px] font-semibold text-[#119b73]">
            Starter Plan
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#ecfbf6] text-[17px]">
            🧼
          </div>
        </div>

        <div className="mt-3 text-[32px] font-black leading-none text-[#2a2346]">₹3799</div>
        <div className="mt-1 text-[12px] font-semibold text-[#119b73]">3 Sessions</div>

        <p className="mt-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#8f98aa]">
          Best for beginning a regular care cycle.
        </p>

        <p className="mt-3 max-w-[30ch] text-[14px] leading-[1.65] text-[#626b7f]">
          A starter multi-session plan designed to build consistency, improve
          hygiene upkeep, and support healthier coats over time.
        </p>

        <div className="mt-[18px] mb-[18px] h-px w-full bg-[#edf1f4]" />

        <div className="mt-auto flex flex-col">
          <button
            type="button"
            onClick={() => handlePackageBookNow("Starter Plan")}
            className="flex h-[50px] w-full items-center justify-center rounded-[18px] bg-[#eefcf8] text-[15px] font-semibold leading-none text-[#119b73] shadow-[0_8px_18px_rgba(17,155,115,0.08)] transition hover:bg-[#dcf7ef]"
          >
            <span className="leading-none">Choose Starter</span>
          </button>

          <button
  type="button"
  onClick={() => openPlanDetails("Starter Plan")}
  className="mt-[14px] w-full text-center text-[14px] font-medium leading-[1.2] text-[#8d84b8] underline underline-offset-[3px] decoration-[#d8d0f0] transition hover:text-[#6d5bd0]"
>
  See plan details
</button>
        </div>
      </div>
    </div>
  </div>

  <div className="mt-2 flex items-center justify-center">
    <div className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 shadow-[0_8px_18px_rgba(70,44,120,0.04)]">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            activePlanSlide === index ? "w-5 bg-[#6d5bd0]" : "w-1.5 bg-[#d8cff8]"
          }`}
        />
      ))}
    </div>
  </div>

  {/* Compact compare strip */}
  <div className="mx-auto mt-5 max-w-[560px] rounded-[20px] border border-[#ece5ff] bg-white p-4 shadow-[0_8px_20px_rgba(109,91,208,0.04)]">
    <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9a94b8]">
      Why choose a plan?
    </div>

    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-[12px] bg-[#f8f7fc] p-3">
        <div className="text-[11px] font-bold text-[#9a94b8]">One-time</div>
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] text-[#7a7f8a]">
            <span className="text-[#c0bbd4]">–</span>
            Temporary clean
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#7a7f8a]">
            <span className="text-[#c0bbd4]">–</span>
            Short-term results
          </div>
        </div>
      </div>

      <div className="rounded-[12px] bg-[#f0ecff] p-3">
        <div className="text-[11px] font-bold text-[#6d5bd0]">Plan</div>
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] text-[#4b4370]">
            <span className="text-[#6d5bd0]">✓</span>
            Ongoing coat health
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#4b4370]">
            <span className="text-[#6d5bd0]">✓</span>
            Prevents issues early
          </div>
        </div>
      </div>
    </div>
  </div>

  {/* Compact coat-care-cycle strip */}
  <div className="mx-auto mt-4 max-w-[560px] rounded-[20px] border border-[#ece5ff] bg-white p-4 shadow-[0_8px_20px_rgba(109,91,208,0.04)]">
    <div className="inline-flex rounded-full border border-[#ece5ff] bg-[#faf8ff] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6d5bd0]">
      The Coat Care Cycle
    </div>

    <div className="mt-3.5 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex h-8 min-w-[32px] items-center justify-center rounded-full bg-[#eefbf7] px-2 text-[10px] font-bold text-[#119b73]">
          01
        </div>
        <div>
          <div className="text-[12px] font-bold text-[#2a2346]">Clean</div>
          <div className="text-[11px] leading-[1.7] text-[#6b7280]">
            Reset and remove buildup.
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <div className="flex h-8 min-w-[32px] items-center justify-center rounded-full bg-[#f4efff] px-2 text-[10px] font-bold text-[#6d5bd0]">
          02
        </div>
        <div>
          <div className="text-[12px] font-bold text-[#2a2346]">Maintain</div>
          <div className="text-[11px] leading-[1.7] text-[#6b7280]">
            Prevent matting and keep the coat manageable.
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <div className="flex h-8 min-w-[32px] items-center justify-center rounded-full bg-[#fff4ea] px-2 text-[10px] font-bold text-[#d07a2d]">
          03
        </div>
        <div>
          <div className="text-[12px] font-bold text-[#2a2346]">Nourish</div>
          <div className="text-[11px] leading-[1.7] text-[#6b7280]">
            Support stronger, healthier coats over time.
          </div>
        </div>
      </div>
    </div>
  </div>

  {/* Compact add-ons */}
  <div className="mx-auto mt-4 max-w-[560px] rounded-[20px] border border-[#ece5ff] bg-white p-4 shadow-[0_8px_18px_rgba(109,91,208,0.04)]">
    <div className="text-[13px] font-bold text-[#2a2346]">Optional add-ons</div>
    <p className="mt-0.5 text-[11px] leading-[1.7] text-[#8b90a0]">
      Available during booking
    </p>

    <div className="mt-3 flex flex-wrap gap-2">
      {["Anti-Tick Protection", "Gland Cleaning", "Deworming"].map((addon) => (
        <span
          key={addon}
          className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-3 py-1.5 text-[11px] font-medium text-[#5f6673]"
        >
          {addon}
        </span>
      ))}
    </div>
  </div>
</div>         {/* DESKTOP PLANS */}
          <div className="hidden lg:block">
            <div className="mx-auto mt-14 max-w-[880px] text-center">
              <div className="text-[28px] font-black leading-[1.35] tracking-[-0.02em] text-[#2a2346] md:text-[34px]">
                Not all coats are the same.
                <br />
                Not all grooming is equal.
                <br />
                And one session is never enough.
              </div>

              <p className="mt-5 text-[18px] leading-[1.8] text-[#6b7280]">
                That’s why we built structured coat care plans.
              </p>
            </div>

            <div className="mt-16 rounded-[36px] border border-[#eee7ff] bg-white p-6 shadow-[0_24px_70px_rgba(73,44,120,0.06)] md:p-10">
              <div className="grid items-center gap-14 lg:grid-cols-[480px_1fr]">
                <div className="relative h-[380px] overflow-hidden rounded-[28px] border border-[#efe7ff] bg-[linear-gradient(135deg,#f8f4ff_0%,#fff8f1_100%)] shadow-[0_18px_50px_rgba(73,44,120,0.06)] md:h-[520px]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(122,92,224,0.16),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(255,177,92,0.18),transparent_32%)]" />
                  <div className="absolute left-6 top-6 h-16 w-16 rounded-[22px] bg-white/40 blur-xl" />
                  <div className="absolute bottom-8 right-8 h-24 w-24 rounded-full bg-[#ffd9bf]/40 blur-2xl" />

                  <div className="relative flex h-full w-full items-center justify-center px-8 text-center">
                    <div>
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] bg-white/80 text-[28px] shadow-sm">
                        🐾
                      </div>
                      <p className="mt-5 text-[16px] font-semibold text-[#2a2346]">
                        Coat care image placeholder
                      </p>
                      <p className="mx-auto mt-2 max-w-[280px] text-[14px] leading-[1.7] text-[#6b7280]">
                        Add a calm grooming or healthy coat visual here for emotional warmth.
                      </p>
                    </div>
                  </div>

                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/50 to-transparent" />
                </div>

                <div>
                  <div className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#7a5ce0]">
                    Designed as a structured coat wellness system
                  </div>

                  <h3 className="mt-4 text-[40px] font-black leading-[1.05] tracking-[-0.03em] text-[#2a2346] md:text-[46px]">
                    The Coat Care Cycle
                  </h3>

                  <p className="mt-5 max-w-[500px] text-[18px] leading-[1.8] text-[#6b7280]">
                    Each plan follows a deliberate cycle to clean, maintain, and nourish your pet’s coat over time.
                  </p>

                  <div className="mt-8 grid gap-4 md:grid-cols-3">
                    <div className="rounded-[22px] border border-[#e9f5f1] bg-[#fcfffe] p-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#eafbf5] text-[14px] font-bold text-[#119b73]">
                          01
                        </div>
                        <div className="text-[24px] font-black text-[#2a2346]">Clean</div>
                      </div>

                      <p className="mt-4 text-[15px] leading-[1.8] text-[#6b7280]">
                        Removes dirt, allergens, and buildup to create a healthy base for the skin.
                      </p>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <span className="rounded-full bg-[#f2fcf8] px-3 py-2 text-[13px] font-medium leading-none text-[#11795d]">
                          Less odor
                        </span>
                        <span className="rounded-full bg-[#f2fcf8] px-3 py-2 text-[13px] font-medium leading-none text-[#11795d]">
                          Fewer irritations
                        </span>
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-[#ebe5ff] bg-[#fdfcff] p-5 shadow-[0_14px_32px_rgba(109,91,208,0.06)]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#f4efff] text-[14px] font-bold text-[#6d5bd0]">
                          02
                        </div>
                        <div className="text-[24px] font-black text-[#2a2346]">Maintain</div>
                      </div>

                      <p className="mt-4 text-[15px] leading-[1.8] text-[#6b7280]">
                        Controls coat length, improves airflow, and helps prevent matting and discomfort.
                      </p>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <span className="rounded-full bg-[#f7f4ff] px-3 py-2 text-[13px] font-medium leading-none text-[#5b4bc2]">
                          Fewer mats
                        </span>
                        <span className="rounded-full bg-[#f7f4ff] px-3 py-2 text-[13px] font-medium leading-none text-[#5b4bc2]">
                          Better comfort
                        </span>
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-[#f8e3d2] bg-[#fffdfa] p-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#fff4ec] text-[14px] font-bold text-[#ea580c]">
                          03
                        </div>
                        <div className="text-[24px] font-black text-[#2a2346]">Nourish</div>
                      </div>

                      <p className="mt-4 text-[15px] leading-[1.8] text-[#6b7280]">
                        Deep conditioning and targeted treatments support stronger, shinier coats over time.
                      </p>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <span className="rounded-full bg-[#fff5ee] px-3 py-2 text-[13px] font-medium leading-none text-[#c86f18]">
                          More shine
                        </span>
                        <span className="rounded-full bg-[#fff5ee] px-3 py-2 text-[13px] font-medium leading-none text-[#c86f18]">
                          Stronger coat
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="mt-6 text-[14px] leading-[1.8] text-[#7b7f8a]">
                    This cycle repeats over time to continuously improve coat health, comfort, and manageability.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <span className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-4 py-2 text-[14px] font-medium text-[#4b4370] shadow-sm">
                Breed-aware grooming
              </span>
              <span className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-4 py-2 text-[14px] font-medium text-[#4b4370] shadow-sm">
                pH-balanced products
              </span>
              <span className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-4 py-2 text-[14px] font-medium text-[#4b4370] shadow-sm">
                Trained coat-care specialists
              </span>
              <span className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-4 py-2 text-[14px] font-medium text-[#4b4370] shadow-sm">
                Stress-free handling
              </span>
            </div>

            <div className="mt-16 grid gap-8 lg:grid-cols-3">
              <div className="flex h-full flex-col rounded-[30px] border border-[#e6eef0] bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.06)]">
                <div className="grid grid-cols-[1fr_56px] items-start gap-5 pt-2">
                  <div className="min-w-0">
                    <div className="inline-flex whitespace-nowrap rounded-full bg-[#eafbf5] px-4 py-2 text-[13px] font-semibold text-[#119b73]">
                      Starter Plan
                    </div>
                    <div className="mt-5 text-[40px] font-black leading-none text-[#2a2346]">
                      ₹3799
                    </div>
                    <p className="mt-4 text-[15px] font-medium text-[#2a2346]">
                      3 Sessions
                    </p>
                    <p className="mt-2 max-w-[320px] text-[15px] leading-[1.75] text-[#6b7280]">
                      Designed for first-time care or irregular routines
                    </p>
                  </div>

                  <div className="mt-[18px] flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#ecfbf6] text-[24px] shadow-sm">
                    🧼
                  </div>
                </div>

                <div className="mt-7 h-px w-full bg-[#edf1f4]" />

                <ul className="mt-7 space-y-4 text-[15px] text-[#2f2f39]">
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 text-[#119b73]">✓</span>
                    <span>Foundational hygiene &amp; coat reset</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 text-[#119b73]">✓</span>
                    <span>Ideal for starting a regular care cycle</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 text-[#119b73]">✓</span>
                    <span>Supports early skin and coat maintenance</span>
                  </li>
                </ul>

                <div className="mt-3 flex flex-wrap gap-2 sm:mt-6">
                  <span className="rounded-full border border-[#dbf5ea] bg-[#f5fdf9] px-3 py-1.5 text-[12px] font-medium text-[#119b73]">
                    Great first step
                  </span>
                </div>

                <div className="mt-auto pt-8">
                  <button
                    type="button"
                    onClick={() => handlePackageBookNow("Starter Plan")}
                    className="w-full rounded-[14px] bg-[#eefcf8] py-3.5 text-[15px] font-semibold text-[#119b73] transition hover:bg-[#dcf7ef]"
                  >
                    Choose Starter
                  </button>
                </div>
              </div>

              <div className="relative flex h-full flex-col rounded-[34px] border border-[#ddd3ff] bg-white p-8 shadow-[0_34px_90px_rgba(109,91,208,0.16)]">
                <div className="pointer-events-none absolute -top-5 left-1/2 z-20 -translate-x-1/2">
                  <div className="rounded-full border border-white/30 bg-[#6d5bd0]/90 px-5 py-2 text-[12px] font-semibold leading-none whitespace-nowrap text-white backdrop-blur-md shadow-[0_10px_24px_rgba(109,91,208,0.18)]">
                    Most Recommended
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_56px] items-start gap-5 pt-2">
                  <div className="min-w-0">
                    <div className="inline-flex whitespace-nowrap rounded-full bg-[#f4efff] px-4 py-2 text-[13px] font-semibold text-[#6d5bd0]">
                      Care Plan
                    </div>
                    <div className="mt-5 text-[40px] font-black leading-none text-[#2a2346]">
                      ₹6999
                    </div>
                    <p className="mt-4 text-[15px] font-medium text-[#2a2346]">
                      6 Sessions
                    </p>
                    <p className="mt-2 max-w-[320px] text-[15px] leading-[1.75] text-[#6b7280]">
                      Designed for pets that need consistent upkeep
                    </p>
                    <p className="mt-5 text-[15px] leading-[1.8] text-[#6b7280]">
                      Most pet parents choose this for balanced care and consistent results.
                    </p>
                  </div>

                  <div className="mt-[18px] flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#f5f1ff] text-[24px] shadow-sm">
                    ✂️
                  </div>
                </div>

                <div className="mt-7 h-px w-full bg-[#ece5ff]" />

                <ul className="mt-7 space-y-4 text-[15px] text-[#2f2f39]">
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 text-[#6d5bd0]">✓</span>
                    <span>Structured maintenance over multiple cycles</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 text-[#6d5bd0]">✓</span>
                    <span>Helps reduce odor, tangles, and shedding</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 text-[#6d5bd0]">✓</span>
                    <span>Better continuity and monitoring over time</span>
                  </li>
                </ul>

                <div className="mt-3 flex flex-wrap gap-2 sm:mt-6">
                  <span className="rounded-full border border-[#e5dcff] bg-[#faf8ff] px-3 py-1.5 text-[12px] font-medium text-[#5b4bc2]">
                    Priority scheduling
                  </span>
                  <span className="rounded-full border border-[#e5dcff] bg-[#faf8ff] px-3 py-1.5 text-[12px] font-medium text-[#5b4bc2]">
                    Better long-term results
                  </span>
                </div>

                <div className="mt-auto pt-8">
                  <button
                    type="button"
                    onClick={() => handlePackageBookNow("Care Plan")}
                    className="w-full rounded-[16px] bg-[#6d5bd0] py-3.5 text-[15px] font-semibold text-white shadow-[0_14px_30px_rgba(109,91,208,0.18)] transition hover:bg-[#5f4fc2]"
                  >
                    Start Care Plan
                  </button>
                </div>
              </div>

              <div className="relative flex h-full flex-col rounded-[34px] border border-[#f6d9c0] bg-white p-8 shadow-[0_34px_90px_rgba(234,88,12,0.14)]">
                <div className="pointer-events-none absolute -top-5 left-1/2 z-20 -translate-x-1/2">
                  <div className="rounded-full border border-white/30 bg-[#f97316]/90 px-5 py-2 text-[12px] font-semibold leading-none whitespace-nowrap text-white backdrop-blur-md shadow-[0_10px_24px_rgba(255,145,92,0.24)]">
                    Best Value
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_56px] items-start gap-5 pt-2">
                  <div className="min-w-0">
                    <div className="inline-flex whitespace-nowrap rounded-full bg-[#fff4ec] px-4 py-2 text-[13px] font-semibold text-[#ea580c]">
                      Wellness Plan
                    </div>
                    <div className="mt-5 bg-gradient-to-r from-[#ff8a5b] to-[#ffb15c] bg-clip-text text-[40px] font-black leading-none text-transparent">
                      ₹14999
                    </div>
                    <p className="mt-4 text-[15px] font-medium text-[#2a2346]">
                      12 Sessions
                    </p>
                    <p className="mt-2 max-w-[320px] text-[15px] leading-[1.75] text-[#6b7280]">
                      Designed for long-term coat health and maintenance
                    </p>
                  </div>

                  <div className="mt-[18px] flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff4ec] text-[24px] shadow-sm">
                    ✨
                  </div>
                </div>

                <div className="mt-7 h-px w-full bg-[#f8e1d0]" />

                <ul className="mt-7 space-y-4 text-[15px] text-[#2f2f39]">
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 text-[#ea580c]">✓</span>
                    <span>Extended care across full skin and coat cycles</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 text-[#ea580c]">✓</span>
                    <span>Ideal for long-term management and breed-specific needs</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 text-[#ea580c]">✓</span>
                    <span>Best for families committed to year-round upkeep</span>
                  </li>
                </ul>

                <div className="relative z-10 mt-6 flex flex-wrap gap-2">
                  <span className="rounded-full border border-[#fde3cd] bg-[#fff6ee] px-3 py-1.5 text-[12px] font-medium text-[#c77717]">
                    Lower cost per session
                  </span>
                  <span className="rounded-full border border-[#fde3cd] bg-[#fff6ee] px-3 py-1.5 text-[12px] font-medium text-[#c77717]">
                    Long-term value
                  </span>
                </div>

                <div className="relative z-10 mt-auto pt-8">
                  <button
                    type="button"
                    onClick={() => handlePackageBookNow("Wellness Plan")}
                    className="w-full rounded-[16px] bg-gradient-to-r from-[#ff8a5b] to-[#ffb15c] py-3.5 text-[15px] font-semibold text-white shadow-[0_14px_30px_rgba(255,145,92,0.24)] transition hover:brightness-[0.98]"
                  >
                    Choose Wellness Plan
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
  <span className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-4 py-2 text-[14px] font-medium text-[#4b4370] shadow-sm">
    Better value than repeated one-off visits
  </span>
  <span className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-4 py-2 text-[14px] font-medium text-[#4b4370] shadow-sm">
    More consistent results over time
  </span>
  <span className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-4 py-2 text-[14px] font-medium text-[#4b4370] shadow-sm">
    Designed for preventive coat care
  </span>
</div>

<div className="mt-16 flex flex-col items-center justify-center gap-5 text-center">
  <div className="text-[15px] font-medium text-[#6b7280]">
    Why pet parents choose coat care plans
  </div>

  <div className="flex flex-wrap items-center justify-center gap-3">
    <span className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-4 py-2 text-[14px] font-medium text-[#4b4370] shadow-sm">
      Reduced shedding &amp; odor
    </span>
    <span className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-4 py-2 text-[14px] font-medium text-[#4b4370] shadow-sm">
      Healthier skin barrier
    </span>
    <span className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-4 py-2 text-[14px] font-medium text-[#4b4370] shadow-sm">
      Fewer mats &amp; tangles
    </span>
    <span className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-4 py-2 text-[14px] font-medium text-[#4b4370] shadow-sm">
      Early issue detection
    </span>
    <span className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-4 py-2 text-[14px] font-medium text-[#4b4370] shadow-sm">
      Consistent coat quality
    </span>
    <span className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-4 py-2 text-[14px] font-medium text-[#4b4370] shadow-sm">
      Lower long-term grooming cost
    </span>
  </div>
</div>

<div className="mt-20 grid gap-8 xl:grid-cols-[1fr_auto_1fr] xl:items-center">
  <div className="rounded-[34px] border border-[#f2d5d5] bg-[linear-gradient(180deg,#fffafa_0%,#fffdfd_100%)] p-8 shadow-[0_20px_50px_rgba(140,90,90,0.06)]">
    <div className="rounded-[28px] border border-[#f2d5d5] bg-[#fff8f8] p-8">
      <h4 className="text-[24px] font-black text-[#2a2346]">
        One-Time Grooming
      </h4>

      <div className="mt-8 space-y-6 text-[18px] leading-[1.8] text-[#6b7280]">
        <div>Temporary clean</div>
        <div>Looks better for a few days</div>
        <div>Issues come back</div>
      </div>
    </div>
  </div>

  <div className="flex items-center justify-center">
    <div className="flex h-[82px] w-[82px] items-center justify-center rounded-full border border-[#e8ddff] bg-white text-[32px] font-black text-[#6d5bd0] shadow-[0_18px_40px_rgba(109,91,208,0.10)]">
      vs
    </div>
  </div>

  <div className="rounded-[34px] border border-[#e9e1ff] bg-[linear-gradient(180deg,#faf8ff_0%,#ffffff_100%)] p-8 shadow-[0_24px_60px_rgba(109,91,208,0.08)]">
    <div className="rounded-[28px] border border-[#e9e1ff] bg-white p-8">
      <h4 className="text-[24px] font-black text-[#2a2346]">
        Coat Care Plan
      </h4>

      <div className="mt-8 space-y-6 text-[18px] leading-[1.8] text-[#6b7280]">
        <div>Ongoing coat health</div>
        <div>Prevents issues early</div>
        <div>Consistent shine &amp; comfort</div>
      </div>
    </div>
  </div>
</div>

<div className="mt-20 rounded-[40px] border border-[#e9e1ff] bg-[linear-gradient(135deg,#f8f5ff_0%,#ffffff_42%,#fffaf4_100%)] p-8 shadow-[0_32px_80px_rgba(109,91,208,0.08)] md:p-10">
  <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
    <div>
      <div className="inline-flex rounded-full border border-[#e8ddff] bg-white/90 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#6d5bd0]">
        Designed as a structured coat wellness system
      </div>

      <h3 className="mt-6 text-[42px] font-black leading-[1.04] tracking-[-0.03em] text-[#2a2346] md:text-[56px]">
        The Coat Care
        <br />
        Cycle
      </h3>

      <p className="mt-6 max-w-[560px] text-[19px] leading-[1.9] text-[#6b7280]">
        Each plan follows a deliberate cycle to clean, maintain, and nourish
        your pet’s coat over time.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-[26px] border border-[#d9efe2] bg-[#f4fcf7] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#dff4e8] text-[18px] font-black text-[#42956c]">
              01
            </div>
            <div className="text-[22px] font-black text-[#2a2346]">Clean</div>
          </div>

          <p className="mt-5 text-[16px] leading-[1.8] text-[#6b7280]">
            Removes dirt, allergens, and buildup to create a healthy base for
            the skin.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#eaf7ef] px-4 py-2 text-[13px] font-medium text-[#42956c]">
              Less odor
            </span>
            <span className="rounded-full bg-[#eaf7ef] px-4 py-2 text-[13px] font-medium text-[#42956c]">
              Fewer irritations
            </span>
          </div>
        </div>

        <div className="rounded-[26px] border border-[#e8ddff] bg-[#faf8ff] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#efe7ff] text-[18px] font-black text-[#6d5bd0]">
              02
            </div>
            <div className="text-[22px] font-black text-[#2a2346]">
              Maintain
            </div>
          </div>

          <p className="mt-5 text-[16px] leading-[1.8] text-[#6b7280]">
            Controls coat length, improves airflow, and helps prevent matting
            and discomfort.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#f1edff] px-4 py-2 text-[13px] font-medium text-[#6d5bd0]">
              Fewer mats
            </span>
            <span className="rounded-full bg-[#f1edff] px-4 py-2 text-[13px] font-medium text-[#6d5bd0]">
              Better comfort
            </span>
          </div>
        </div>

        <div className="rounded-[26px] border border-[#f4dfcf] bg-[#fffaf5] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#f8ecdf] text-[18px] font-black text-[#d86a2e]">
              03
            </div>
            <div className="text-[22px] font-black text-[#2a2346]">Nourish</div>
          </div>

          <p className="mt-5 text-[16px] leading-[1.8] text-[#6b7280]">
            Deep conditioning and targeted treatments support stronger, shinier
            coats over time.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#fbf1e7] px-4 py-2 text-[13px] font-medium text-[#c7772b]">
              More shine
            </span>
            <span className="rounded-full bg-[#fbf1e7] px-4 py-2 text-[13px] font-medium text-[#c7772b]">
              Stronger coat
            </span>
          </div>
        </div>
      </div>

      <p className="mt-8 max-w-[620px] text-[18px] leading-[1.9] text-[#6b7280]">
        This cycle repeats over time to continuously improve coat health,
        comfort, and manageability.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <span className="rounded-full border border-[#ece5ff] bg-white px-5 py-2.5 text-[14px] font-medium text-[#4b4370] shadow-sm">
          Breed-aware grooming
        </span>
        <span className="rounded-full border border-[#ece5ff] bg-white px-5 py-2.5 text-[14px] font-medium text-[#4b4370] shadow-sm">
          pH-balanced products
        </span>
        <span className="rounded-full border border-[#ece5ff] bg-white px-5 py-2.5 text-[14px] font-medium text-[#4b4370] shadow-sm">
          Trained coat-care specialists
        </span>
        <span className="rounded-full border border-[#ece5ff] bg-white px-5 py-2.5 text-[14px] font-medium text-[#4b4370] shadow-sm">
          Stress-free handling
        </span>
      </div>
    </div>

    <div>
      <div className="relative overflow-hidden rounded-[34px] border border-[#ede7fb] bg-[linear-gradient(135deg,#f4f0ff_0%,#fffaf4_100%)] p-8 shadow-[0_24px_60px_rgba(109,91,208,0.08)]">
        <div className="absolute left-[-40px] top-[-30px] h-[180px] w-[180px] rounded-full bg-[#e8defd] blur-[70px]" />
        <div className="absolute bottom-[-30px] right-[-20px] h-[160px] w-[160px] rounded-full bg-[#fde9d5] blur-[70px]" />

        <div className="relative flex h-[420px] items-center justify-center rounded-[28px] border border-[#ece5ff] bg-white/65 px-8 text-center">
          <div>
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[28px] bg-white text-[34px] shadow-[0_12px_30px_rgba(42,35,70,0.08)]">
              🐾
            </div>

            <div className="mt-8 text-[20px] font-black text-[#2a2346]">
              Coat care image placeholder
            </div>

            <p className="mx-auto mt-4 max-w-[320px] text-[16px] leading-[1.8] text-[#6b7280]">
              Add a calm grooming or healthy coat visual here for emotional
              warmth.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<div className="mt-20 rounded-[40px] border border-[#e9e1ff] bg-[linear-gradient(180deg,#ffffff_0%,#fcfbff_100%)] p-10 text-center shadow-[0_24px_60px_rgba(109,91,208,0.07)]">
  <div className="inline-flex rounded-full border border-[#e8ddff] bg-[#faf8ff] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#6d5bd0]">
    Structured coat care plans
  </div>

  <h3 className="mx-auto mt-6 max-w-[900px] text-[46px] font-black leading-[1.08] tracking-[-0.03em] text-[#2a2346] md:text-[58px]">
    One visit improves appearance.
    <br />
    <span className="bg-gradient-to-r from-[#42956c] via-[#5d86b7] to-[#6570c9] bg-clip-text text-transparent">
      Structured care improves health,
      comfort, and confidence.
    </span>
  </h3>

  <p className="mx-auto mt-6 max-w-[860px] text-[19px] leading-[1.9] text-[#6b7280]">
    With consistent care, you’ll notice less shedding at home, better coat
    texture, reduced skin irritation, and happier, calmer pets.
  </p>

  <button
    type="button"
    onClick={() => handlePackageBookNow("Care Plan")}
    className="mt-10 inline-flex h-[56px] items-center justify-center rounded-[18px] bg-[#6d5bd0] px-10 text-[18px] font-semibold text-white shadow-[0_16px_36px_rgba(109,91,208,0.22)] transition hover:bg-[#5f4fc2]"
  >
    Start Care Plan
  </button>
</div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
</div>
</section>

{/* HOW IT WORKS SECTION */}
<section className="order-4 lg:order-none relative overflow-hidden bg-[linear-gradient(180deg,#fcfaff_0%,#f7f3ff_100%)] pt-8 pb-10 sm:py-20 lg:py-[120px]">
  {/* BACKGROUND GLOWS */}
  <div className="pointer-events-none absolute inset-0">
    <div className="absolute left-[-120px] top-[120px] h-[280px] w-[280px] rounded-full bg-[#efe7ff] blur-[95px]" />
    <div className="absolute right-[-100px] bottom-[100px] h-[260px] w-[260px] rounded-full bg-[#fff3ea] blur-[95px]" />
    <div className="absolute left-[38%] top-[28%] h-[180px] w-[180px] rounded-full bg-[#eefcf8] blur-[85px]" />
  </div>

  <div className="relative z-10 mx-auto max-w-[1240px] px-4 sm:px-6">
    {/* HEADER */}
    <div className="mx-auto max-w-[820px] text-center">
      <div className="inline-flex rounded-full border border-[#e8ddff] bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7a5ce0] shadow-[0_10px_24px_rgba(122,92,224,0.08)] sm:px-5 sm:py-2.5 sm:text-[13px]">
        How It Works
      </div>

      <h2 className="mt-3 text-[23px] font-black leading-[1.08] tracking-[-0.03em] text-[#2a2346] sm:mt-7 sm:text-[40px] md:text-[54px]">
        A calm,
        <span className="text-[#6d5bd0]"> premium grooming </span>
        experience
      </h2>

      <p className="mx-auto mt-2 max-w-[300px] text-[13px] leading-[1.65] text-[#6b7280] sm:mt-5 sm:max-w-[760px] sm:text-[18px] sm:leading-[1.8]">
        Every step is designed to keep your pet comfortable, safe, and stress-free.
      </p>
    </div>

    {/* ── MOBILE: COMPACT TIMELINE CARDS ── */}
    <div className="lg:hidden mt-4 flex flex-col gap-2.5">

      {/* STEP 1 */}
      <div className="flex gap-3 rounded-[20px] border border-[#ebe5ff] bg-white p-4 shadow-[0_6px_20px_rgba(73,44,120,0.05)]">
        <div className="shrink-0 flex h-7 w-7 items-center justify-center rounded-[9px] bg-[#f4efff] text-[11px] font-bold text-[#6d5bd0]">01</div>
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6d5bd0]">Planning</div>
          <h3 className="mt-0.5 text-[15px] font-black leading-[1.18] tracking-[-0.02em] text-[#2a2346]">Plan the look first</h3>
          <p className="mt-1.5 text-[12.5px] leading-[1.6] text-[#6b7280]">We align on the style before the visit so your groomer arrives fully briefed.</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-[#e8ddff] bg-[#faf8ff] px-2.5 py-1 text-[11px] font-medium text-[#5b4bc2]">Styling mockups</span>
            <span className="rounded-full border border-[#e8ddff] bg-[#faf8ff] px-2.5 py-1 text-[11px] font-medium text-[#5b4bc2]">Groomer briefed</span>
          </div>
        </div>
      </div>

      {/* STEP 2 */}
      <div className="flex gap-3 rounded-[20px] border border-[#dff3ec] bg-white p-4 shadow-[0_6px_20px_rgba(17,155,115,0.04)]">
        <div className="shrink-0 flex h-7 w-7 items-center justify-center rounded-[9px] bg-[#eafbf5] text-[11px] font-bold text-[#119b73]">02</div>
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#119b73]">Comfort</div>
          <h3 className="mt-0.5 text-[15px] font-black leading-[1.18] tracking-[-0.02em] text-[#2a2346]">Earn your pet&apos;s trust</h3>
          <p className="mt-1.5 text-[12.5px] leading-[1.6] text-[#6b7280]">We take time to bond with your pet while every tool and surface is sanitized.</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-[#dff3ec] bg-[#f5fdf9] px-2.5 py-1 text-[11px] font-medium text-[#11795d]">Bonding first</span>
            <span className="rounded-full border border-[#dff3ec] bg-[#f5fdf9] px-2.5 py-1 text-[11px] font-medium text-[#11795d]">Sanitized setup</span>
          </div>
        </div>
      </div>

      {/* STEP 3 */}
      <div className="flex gap-3 rounded-[20px] border border-[#efcfba] bg-white p-4 shadow-[0_6px_20px_rgba(234,88,12,0.05)]">
        <div className="shrink-0 flex h-7 w-7 items-center justify-center rounded-[9px] bg-[#fff4ec] text-[11px] font-bold text-[#ea580c]">03</div>
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ea580c]">Grooming</div>
          <h3 className="mt-0.5 text-[15px] font-black leading-[1.18] tracking-[-0.02em] text-[#2a2346]">Calm grooming, start to finish</h3>
          <p className="mt-1.5 text-[12.5px] leading-[1.6] text-[#6b7280]">From bath to haircut and finishing, every step is done patiently and safely.</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-[#f6e4d5] bg-[#fff6ef] px-2.5 py-1 text-[11px] font-medium text-[#c86f18]">Premium sequence</span>
            <span className="rounded-full border border-[#f6e4d5] bg-[#fff6ef] px-2.5 py-1 text-[11px] font-medium text-[#c86f18]">Stress-free handling</span>
          </div>
        </div>
      </div>

      {/* STEP 4 */}
      <div className="flex gap-3 rounded-[20px] border border-[#ebe5ff] bg-white p-4 shadow-[0_6px_20px_rgba(73,44,120,0.05)]">
        <div className="shrink-0 flex h-7 w-7 items-center justify-center rounded-[9px] bg-[#f4efff] text-[11px] font-bold text-[#6d5bd0]">04</div>
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6d5bd0]">Quality</div>
          <h3 className="mt-0.5 text-[15px] font-black leading-[1.18] tracking-[-0.02em] text-[#2a2346]">Quality checked in real time</h3>
          <p className="mt-1.5 text-[12.5px] leading-[1.6] text-[#6b7280]">Senior groomers review the session as it happens to ensure the finish meets standard.</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-[#e8ddff] bg-[#faf8ff] px-2.5 py-1 text-[11px] font-medium text-[#5b4bc2]">Live QA checks</span>
            <span className="rounded-full border border-[#e8ddff] bg-[#faf8ff] px-2.5 py-1 text-[11px] font-medium text-[#5b4bc2]">Senior supervision</span>
          </div>
        </div>
      </div>

      {/* MOBILE REASSURANCE STRIP */}
      <div className="mt-1 text-center py-3">
        <p className="text-[13px] font-bold tracking-[-0.01em] text-[#2a2346]">
          <span className="text-[#6d5bd0]">No cages.</span>{" "}
          <span>No rush.</span>{" "}
          <span className="text-[#6d5bd0]">No harsh handling.</span>
        </p>
        <p className="mt-1 text-[12px] leading-[1.6] text-[#8b90a0]">Just patient professionals and premium products, built around your pet.</p>
      </div>
    </div>

    {/* ── DESKTOP: EDITORIAL GRID CARDS ── */}
    <div className="hidden lg:grid mt-8 gap-4 sm:mt-16 sm:gap-7 lg:grid-cols-4 lg:gap-8">
      {/* STEP 1 */}
      <div className="group relative overflow-hidden rounded-[30px] border border-[#ebe5ff] bg-white p-7 shadow-[0_20px_60px_rgba(73,44,120,0.06)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_75px_rgba(73,44,120,0.10)]">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#faf8ff] to-white opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[#f4efff] text-[15px] font-bold text-[#6d5bd0]">01</div>
            <div className="rounded-full bg-[#faf8ff] px-3 py-1.5 text-[12px] font-semibold text-[#6d5bd0]">Planning</div>
          </div>
          <h3 className="mt-6 text-[24px] font-black leading-[1.15] text-[#2a2346]">
            We plan the perfect look before we begin
          </h3>
          <p className="mt-4 text-[15px] leading-[1.85] text-[#6b7280]">
            Mock styling options are shared with you first, and your groomer is fully briefed on the selected look before reaching your home.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="rounded-full border border-[#e8ddff] bg-[#faf8ff] px-3 py-1.5 text-[12px] font-medium text-[#5b4bc2]">Styling mockups</span>
            <span className="rounded-full border border-[#e8ddff] bg-[#faf8ff] px-3 py-1.5 text-[12px] font-medium text-[#5b4bc2]">Groomer briefed</span>
          </div>
        </div>
      </div>

      {/* STEP 2 */}
      <div className="group relative overflow-hidden rounded-[30px] border border-[#dff3ec] bg-white p-7 shadow-[0_20px_60px_rgba(17,155,115,0.05)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_75px_rgba(17,155,115,0.10)]">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#f7fffc] to-white opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[#eafbf5] text-[15px] font-bold text-[#119b73]">02</div>
            <div className="rounded-full bg-[#f5fdf9] px-3 py-1.5 text-[12px] font-semibold text-[#119b73]">Comfort</div>
          </div>
          <h3 className="mt-6 text-[24px] font-black leading-[1.15] text-[#2a2346]">
            We take time to earn your pet&apos;s trust
          </h3>
          <p className="mt-4 text-[15px] leading-[1.85] text-[#6b7280]">
            We spend time calming and bonding with your pet, while our helper sanitizes every tool and grooming surface before the session begins.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="rounded-full border border-[#dff3ec] bg-[#f5fdf9] px-3 py-1.5 text-[12px] font-medium text-[#11795d]">10-minute bonding</span>
            <span className="rounded-full border border-[#dff3ec] bg-[#f5fdf9] px-3 py-1.5 text-[12px] font-medium text-[#11795d]">Sanitized setup</span>
          </div>
        </div>
      </div>

      {/* STEP 3 */}
      <div className="group relative overflow-hidden rounded-[30px] border border-[#efcfba] bg-white p-7 shadow-[0_26px_72px_rgba(234,88,12,0.09)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_34px_90px_rgba(234,88,12,0.13)]">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#fffaf6] to-white opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[#fff4ec] text-[15px] font-bold text-[#ea580c]">03</div>
            <div className="rounded-full bg-[#fff6ef] px-3 py-1.5 text-[12px] font-semibold text-[#ea580c]">Grooming</div>
          </div>
          <h3 className="mt-6 text-[24px] font-black leading-[1.15] text-[#2a2346]">
            Gentle, premium grooming from start to finish
          </h3>
          <p className="mt-4 text-[15px] leading-[1.85] text-[#6b7280]">
            From massage and bath to haircut, paw care, ear cleaning, dental care, serum, brushing, and finishing — every step is done patiently and safely.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="rounded-full border border-[#f6e4d5] bg-[#fff6ef] px-3 py-1.5 text-[12px] font-medium text-[#c86f18]">Premium sequence</span>
            <span className="rounded-full border border-[#f6e4d5] bg-[#fff6ef] px-3 py-1.5 text-[12px] font-medium text-[#c86f18]">Stress-free handling</span>
          </div>
        </div>
      </div>

      {/* STEP 4 */}
      <div className="group relative overflow-hidden rounded-[30px] border border-[#ebe5ff] bg-white p-7 shadow-[0_20px_60px_rgba(73,44,120,0.06)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_75px_rgba(73,44,120,0.10)]">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#faf8ff] to-white opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[#f4efff] text-[15px] font-bold text-[#6d5bd0]">04</div>
            <div className="rounded-full bg-[#faf8ff] px-3 py-1.5 text-[12px] font-semibold text-[#6d5bd0]">Quality</div>
          </div>
          <h3 className="mt-6 text-[24px] font-black leading-[1.15] text-[#2a2346]">
            Every session is monitored for quality
          </h3>
          <p className="mt-4 text-[15px] leading-[1.85] text-[#6b7280]">
            Throughout the service, our backend QA team of senior groomers reviews photos and videos in real time to ensure every session meets our highest standards.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="rounded-full border border-[#e8ddff] bg-[#faf8ff] px-3 py-1.5 text-[12px] font-medium text-[#5b4bc2]">Live QA checks</span>
            <span className="rounded-full border border-[#e8ddff] bg-[#faf8ff] px-3 py-1.5 text-[12px] font-medium text-[#5b4bc2]">Senior supervision</span>
          </div>
        </div>
      </div>
    </div>

    {/* REASSURANCE BLOCK — DESKTOP ONLY */}
    <div className="hidden lg:block mx-auto mt-14 max-w-[980px] rounded-[32px] border border-[#e9e2ff] bg-[linear-gradient(180deg,#ffffff_0%,#fbf9ff_100%)] px-6 py-8 text-center shadow-[0_25px_70px_rgba(109,91,208,0.08)] md:px-10">
      <div className="text-[26px] font-black tracking-[-0.02em] text-[#2a2346] md:text-[32px]">
        <span className="text-[#6d5bd0]">No cages.</span>{" "}
        <span className="text-[#2a2346]">No rush.</span>{" "}
        <span className="text-[#6d5bd0]">No harsh handling.</span>
      </div>
      <div className="mx-auto mt-5 h-[1px] w-[80px] bg-gradient-to-r from-transparent via-[#dcd3ff] to-transparent" />
      <p className="mx-auto mt-5 max-w-[720px] text-[16px] leading-[1.9] text-[#6b7280] md:text-[17px]">
        Just patient professionals, premium products, and a grooming experience built around your pet.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <span className="rounded-full border border-[#ece5ff] bg-white px-4 py-1.5 text-[13px] font-medium text-[#4b4370] shadow-sm">Stress-free experience</span>
        <span className="rounded-full border border-[#ece5ff] bg-white px-4 py-1.5 text-[13px] font-medium text-[#4b4370] shadow-sm">Gentle handling</span>
        <span className="rounded-full border border-[#ece5ff] bg-white px-4 py-1.5 text-[13px] font-medium text-[#4b4370] shadow-sm">Pet-first approach</span>
      </div>
    </div>
  </div>
</section>

<section id="reviews-section" className="order-3 lg:order-none relative overflow-hidden bg-white py-12 sm:py-16 lg:py-[130px]">
  <div className="pointer-events-none absolute inset-0">
    <div className="absolute inset-0 bg-[linear-gradient(180deg,#fbfaff_0%,#ffffff_50%,#fffbf7_100%)]" />
    <div className="absolute left-[-200px] top-[60px] h-[380px] w-[380px] rounded-full bg-[#ede5ff] blur-[120px] opacity-60" />
    <div className="absolute right-[-160px] top-[180px] h-[320px] w-[320px] rounded-full bg-[#fff2e4] blur-[110px] opacity-55" />
    <div className="absolute bottom-[-80px] left-1/2 h-[240px] w-[70%] -translate-x-1/2 rounded-full bg-[#f5eeff] blur-[90px] opacity-50" />
  </div>

  <div className="relative z-10 mx-auto max-w-[1220px] px-4 sm:px-6 lg:px-8">

    {/* ── SHARED INTRO ── */}
    <div className="mx-auto max-w-[780px] text-center">
      <div className="inline-flex rounded-full border border-[#e4d9ff] bg-white/90 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7258e0] shadow-[0_8px_22px_rgba(109,91,208,0.08)] sm:px-5 sm:py-2.5 sm:text-[11px]">
        Pet Parents Love Us
      </div>

      <h2 className="mt-4 text-[28px] font-black leading-[1.04] tracking-[-0.04em] text-[#241b4b] sm:mt-6 sm:text-[40px] lg:text-[54px] xl:text-[60px]">
        Trusted by pets.
        <br />
        <span className="text-[#6d5bd0]">Loved</span> by their humans.
      </h2>

      <p className="mx-auto mt-3 max-w-[36ch] text-[13px] leading-[1.75] text-[#6b7280] sm:mt-5 sm:max-w-[600px] sm:text-[16px] lg:text-[17px]">
        Real reviews from pet parents who trust All Tails for calm handling, gentle care, and beautifully finished grooming.
      </p>

      {/* desktop aggregate strip */}
      <div className="mt-6 hidden sm:mt-7 lg:inline-flex lg:flex-wrap lg:items-center lg:justify-center lg:gap-3 lg:rounded-[18px] lg:border lg:border-[#ebe2ff] lg:bg-[linear-gradient(135deg,#faf6ff_0%,#fff8f2_100%)] lg:px-5 lg:py-3.5 lg:shadow-[0_8px_24px_rgba(109,91,208,0.07)]">
        <div className="flex items-center gap-1 text-[16px] leading-none text-[#f2a11a]">
          {Array.from({ length: 5 }).map((_, i) => <span key={i}>&#9733;</span>)}
        </div>
        <div className="text-[14px] font-bold text-[#3a3060]">4.9 / 5</div>
        <div className="h-4 w-px bg-[#ddd5f5]" />
        <div className="text-[13px] font-medium text-[#7a7394]">
          150+ 5-star reviews &middot; 11 cities
        </div>
      </div>
    </div>

    {/* ══════════════════════════════════
        MOBILE LAYOUT
    ══════════════════════════════════ */}
    <div className="lg:hidden">

      {/* mobile aggregate card */}
      <div className="mt-6 rounded-[24px] border border-[#ece5ff] bg-white px-5 py-5 text-center shadow-[0_12px_30px_rgba(109,91,208,0.05)]">
        <div className="flex items-center justify-center gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-[#f4b740] text-[#f4b740]" />
          ))}
          <span className="ml-2 text-[18px] font-black text-[#2a2346]">4.9 / 5</span>
        </div>
        <p className="mt-2 text-[14px] font-medium text-[#6b7280]">
          150+ 5-star reviews &middot; 11 cities
        </p>
      </div>

      {/* mobile featured review */}
      <div className="mt-6 rounded-[30px] border border-[#ece5ff] bg-white p-5 shadow-[0_18px_42px_rgba(73,44,120,0.07)]">
        <div className="text-[34px] leading-none text-[#d8cff8]">&ldquo;</div>

        <p className="mt-2 text-[17px] font-semibold leading-[1.7] text-[#2f2850]">
          {mobileFeaturedReview.quote}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {mobileFeaturedReview.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-3 py-1.5 text-[12px] font-medium text-[#5f6673]"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-5 h-px w-full bg-[#efe9ff]" />

        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f4efff] text-[13px] font-bold text-[#6d5bd0]">
              {initialsFromName(mobileFeaturedReview.name)}
            </div>
            <div className="min-w-0">
              <div className="truncate text-[14px] font-bold text-[#2a2346]">
                {mobileFeaturedReview.name}
              </div>
              <div className="text-[13px] text-[#8b90a0]">
                Pet Parent &middot; {mobileFeaturedReview.dateLabel}
              </div>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="flex items-center justify-end gap-0.5">
              {Array.from({ length: mobileFeaturedReview.rating }).map((_, i) => (
                <Star key={i} className="h-3.5 w-3.5 fill-[#f4b740] text-[#f4b740]" />
              ))}
            </div>
            <div className="mt-1 text-[12px] text-[#8b90a0]">via Google</div>
          </div>
        </div>
      </div>

      {/* mobile rail title */}
      <div className="mt-8 flex justify-center">
        <div className="inline-flex rounded-full border border-[#e8ddff] bg-white px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#7a5ce0] shadow-[0_8px_18px_rgba(122,92,224,0.05)]">
          More pet parents saying the same
        </div>
      </div>

      {/* mobile snap rail */}
      <div className="-mx-4 mt-5 overflow-x-auto pb-2 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex snap-x snap-mandatory gap-4 pr-6">
          {mobileReviewRailCards.map((card, index) => {
            const accentClasses =
              card.accent && card.accent in proofCardStyles
                ? proofCardStyles[card.accent as keyof typeof proofCardStyles].badge
                : "bg-[#f4efff] text-[#6d5bd0]";
            return (
              <div
                key={`${card.name}-${index}`}
                className="w-[80%] max-w-[300px] shrink-0 snap-start rounded-[24px] border border-[#ece5ff] bg-white p-4 shadow-[0_14px_30px_rgba(73,44,120,0.05)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className={`inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold ${accentClasses}`}>
                    {card.theme}
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-[#f4b740] text-[#f4b740]" />
                    ))}
                  </div>
                </div>
                <p className="mt-4 line-clamp-3 text-[15px] font-medium leading-[1.65] text-[#2f2850]">
                  {card.quote}
                </p>
                <div className="mt-4 text-[13px] font-semibold text-[#4b4370]">{card.name}</div>
                <div className="mt-1 text-[12px] text-[#8b90a0]">via Google</div>
              </div>
            );
          })}
        </div>
      </div>

    </div>

    {/* ══════════════════════════════════
        DESKTOP LAYOUT
    ══════════════════════════════════ */}
    <div className="hidden lg:block">

      {/* featured editorial review + themed proof cards */}
      <div className="mt-14 grid items-start gap-14 lg:grid-cols-[1.04fr_0.96fr]">

        <article className="rounded-[30px] border border-[#eee6ff] bg-white p-9 shadow-[0_18px_48px_rgba(86,61,170,0.08)]">
          <div
            className="select-none font-serif leading-none text-[#6d5bd0]"
            style={{ fontSize: 52, lineHeight: 1, opacity: 0.15, marginBottom: -14 }}
          >
            {"\u201C"}
          </div>

          <p className="text-[17px] leading-[1.86] text-[#4a445e]">
            {featuredEditorialReview.quote}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {featuredEditorialReview.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[#ece5ff] bg-[#faf7ff] px-3.5 py-1.5 text-[12px] font-medium text-[#5c508c]"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-3.5 border-t border-[#f2ecff] pt-5">
            <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ede5ff_0%,#ffeee0_100%)] text-[14px] font-bold text-[#5648c7]">
              {initialsFromName(featuredEditorialReview.name)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-semibold text-[#241b4b]">
                {featuredEditorialReview.name}
              </div>
              <div className="mt-0.5 text-[12px] text-[#9ca3b3]">
                Pet Parent &middot; {featuredEditorialReview.dateLabel}
              </div>
              <div className="mt-1 flex items-center gap-1">
                <span
                  className="inline-flex h-[14px] w-[14px] items-center justify-center rounded-full bg-white text-[9px] font-black shadow-sm"
                  style={{ color: "#4285F4" }}
                >
                  G
                </span>
                <span className="text-[11px] font-medium text-[#b0b8cb]">
                  via Google
                </span>
              </div>
            </div>

            <div className="flex items-center gap-0.5 text-[14px] leading-none text-[#f2a11a]">
              {Array.from({ length: featuredEditorialReview.rating }).map((_, i) => (
                <span key={i}>&#9733;</span>
              ))}
            </div>
          </div>
        </article>

        {/* desktop themed proof bento */}
        <div className="grid grid-rows-[auto_1fr] gap-5 pt-1">
          <div className={`rounded-[28px] border p-6 transition-transform duration-300 hover:-translate-y-1 ${proofCardStyles[themedProofCards[0].accent].card} ${proofCardStyles[themedProofCards[0].accent].shadow}`}>
            <div className={`inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] ${proofCardStyles[themedProofCards[0].accent].badge}`}>
              {themedProofCards[0].theme}
            </div>
            <div className="mt-4 flex items-center gap-1 text-[13px] text-[#f2a11a]">
              {Array.from({ length: 5 }).map((_, i) => <span key={i} className="leading-none">&#9733;</span>)}
            </div>
            <p className={`mt-3 text-[17px] font-semibold leading-[1.55] ${proofCardStyles[themedProofCards[0].accent].text}`}>
              {"\u201C"}{themedProofCards[0].quote}{"\u201D"}
            </p>
            <div className={`mt-4 text-[13px] font-medium ${proofCardStyles[themedProofCards[0].accent].subtext}`}>
              {"\u2014"} {themedProofCards[0].name}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className={`rounded-[24px] border p-5 transition-transform duration-300 hover:-translate-y-1 ${proofCardStyles[themedProofCards[1].accent].card} ${proofCardStyles[themedProofCards[1].accent].shadow}`}>
              <div className={`inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] ${proofCardStyles[themedProofCards[1].accent].badge}`}>
                {themedProofCards[1].theme}
              </div>
              <div className="mt-4 flex items-center gap-1 text-[12px] text-[#f2a11a]">
                {Array.from({ length: 5 }).map((_, i) => <span key={i} className="leading-none">&#9733;</span>)}
              </div>
              <p className={`mt-3 text-[14px] font-semibold leading-[1.6] ${proofCardStyles[themedProofCards[1].accent].text}`}>
                {"\u201C"}{themedProofCards[1].quote}{"\u201D"}
              </p>
              <div className={`mt-3 text-[12px] font-medium ${proofCardStyles[themedProofCards[1].accent].subtext}`}>
                {"\u2014"} {themedProofCards[1].name}
              </div>
            </div>

            <div className={`rounded-[24px] border p-5 transition-transform duration-300 hover:-translate-y-1 ${proofCardStyles[themedProofCards[2].accent].card} ${proofCardStyles[themedProofCards[2].accent].shadow}`}>
              <div className={`inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] ${proofCardStyles[themedProofCards[2].accent].badge}`}>
                {themedProofCards[2].theme}
              </div>
              <div className="mt-4 flex items-center gap-1 text-[12px] text-[#f2a11a]">
                {Array.from({ length: 5 }).map((_, i) => <span key={i} className="leading-none">&#9733;</span>)}
              </div>
              <p className={`mt-3 text-[14px] font-semibold leading-[1.6] ${proofCardStyles[themedProofCards[2].accent].text}`}>
                {"\u201C"}{themedProofCards[2].quote}{"\u201D"}
              </p>
              <div className={`mt-3 text-[12px] font-medium ${proofCardStyles[themedProofCards[2].accent].subtext}`}>
                {"\u2014"} {themedProofCards[2].name}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* desktop marquee rail */}
      <div className="relative mt-16">
        <div className="mx-auto mb-6 h-px w-full max-w-[1120px] bg-[linear-gradient(90deg,transparent_0%,#ece3ff_18%,#f0e7ff_50%,#ece3ff_82%,transparent_100%)]" />

        <div className="mb-5 text-center">
          <div className="inline-flex rounded-full border border-[#ebe3ff] bg-white/88 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a67da] shadow-[0_8px_18px_rgba(109,91,208,0.05)]">
            More pet parents saying the same
          </div>
        </div>

        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-24 bg-[linear-gradient(90deg,#ffffff_0%,rgba(255,255,255,0.94)_24%,rgba(255,255,255,0)_100%)]" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-24 bg-[linear-gradient(270deg,#ffffff_0%,rgba(255,255,255,0.94)_24%,rgba(255,255,255,0)_100%)]" />

          <div className="pointer-events-none absolute inset-0 z-0">
            <div className="absolute left-[10%] top-1/2 h-[90px] w-[90px] -translate-y-1/2 rounded-full bg-[#efe7ff] opacity-55 blur-[50px]" />
            <div className="absolute right-[12%] top-1/2 h-[80px] w-[80px] -translate-y-1/2 rounded-full bg-[#fff1e5] opacity-45 blur-[46px]" />
          </div>

          <div
            className="relative z-10 flex w-max gap-5 py-2"
            style={{ animation: "reviewMarquee 42s linear infinite" }}
          >
            {[...reviewRailCards, ...reviewRailCards].map((item, index) => (
              <article
                key={item.name + String(index)}
                className="min-w-[250px] rounded-[20px] border border-[#eee7ff] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(251,248,255,0.92)_100%)] px-5 py-4 shadow-[0_10px_24px_rgba(73,44,120,0.045)] transition-transform duration-300"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full border border-[#ece5ff] bg-[#faf7ff] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7b6cb8]">
                    {item.theme}
                  </span>
                  <div className="flex items-center gap-[2px] text-[11px] leading-none text-[#f2a11a]">
                    {Array.from({ length: 5 }).map((_, i) => <span key={i}>&#9733;</span>)}
                  </div>
                </div>
                <p className="mt-3 text-[13.5px] font-medium leading-[1.55] text-[#4c4568]">
                  {"\u201C"}{item.quote}{"\u201D"}
                </p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="text-[11px] font-semibold text-[#8e82bd]">{"\u2014"} {item.name}</div>
                  <div className="text-[10px] font-medium text-[#a79fc2]">via Google</div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

    </div>

  </div>
</section>
</div>{/* end mobile section order wrapper */}

{/* FINAL CTA BANNER — retired, replaced by style-preview banner */}
<div className="hidden"><div className="mx-auto mt-20 max-w-[1120px] px-4 sm:px-0">
  <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,#6f5bd2_0%,#5d49c5_52%,#4a379f_100%)] px-6 py-8 shadow-[0_28px_80px_rgba(77,47,122,0.18)] md:px-10 md:py-9 lg:px-14">
    {/* DEPTH */}
    <div className="pointer-events-none absolute inset-0 rounded-[32px] ring-1 ring-white/10" />
    <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-white/20" />

    {/* GLOWS */}
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute left-[-60px] top-1/2 h-[220px] w-[220px] -translate-y-1/2 rounded-full bg-[#8e7be8]/35 blur-[85px]" />
      <div className="absolute right-[-40px] top-1/2 h-[200px] w-[200px] -translate-y-1/2 rounded-full bg-[#ffb58d]/18 blur-[80px]" />
      <div className="absolute left-[24%] top-[22%] h-2 w-2 rounded-full bg-white/20" />
      <div className="absolute right-[22%] top-[28%] h-2.5 w-2.5 rounded-full bg-white/16" />
      <div className="absolute left-[20%] bottom-[24%] h-1.5 w-1.5 rounded-full bg-white/16" />
      <div className="absolute right-[18%] bottom-[22%] h-2 w-2 rounded-full bg-white/18" />
    </div>

    {/* LEFT PET CLUSTER */}
    <div className="pointer-events-none absolute bottom-0 left-0 hidden lg:block">
      <Image
        src="/images/cat-cta.png"
        alt="Pet cluster"
        width={235}
        height={170}
        className="h-[138px] w-auto object-contain object-bottom"
      />
    </div>

    {/* RIGHT PET */}
    <div className="pointer-events-none absolute bottom-0 right-0 hidden lg:block">
      <Image
        src="/images/dog-cta.png"
        alt="Dog"
        width={250}
        height={250}
        className="h-[178px] w-auto object-contain object-bottom"
      />
    </div>

    {/* CONTENT */}
    <div className="relative z-10 mx-auto max-w-[680px] text-center">
      <div className="inline-flex rounded-full border border-white/14 bg-white/10 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-white/85 backdrop-blur-sm">
        Premium At-Home Grooming
      </div>

      <h3 className="mt-5 text-[31px] font-black leading-[1.14] tracking-[-0.035em] text-white md:text-[40px]">
        Your pet
        <br />
        <span className="bg-gradient-to-r from-[#ff8a5b] via-[#ffb15c] to-[#ffd166] bg-clip-text text-transparent">
          deserves more
        </span>
        <span className="text-white"> than a basic groom.</span>
      </h3>

      <p className="mx-auto mt-3 max-w-[560px] text-[16px] leading-[1.8] text-white/82 md:text-[17px]">
        Premium at-home care, handled gently by experts they can trust.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <span className="rounded-full border border-white/12 bg-white/10 px-4 py-2 text-[13px] font-medium text-white/86 backdrop-blur-sm">
          4.9 rated
        </span>
        <span className="rounded-full border border-white/12 bg-white/10 px-4 py-2 text-[13px] font-medium text-white/86 backdrop-blur-sm">
          5000+ sessions
        </span>
        <span className="rounded-full border border-white/12 bg-white/10 px-4 py-2 text-[13px] font-medium text-white/86 backdrop-blur-sm">
          In-house teams only
        </span>
      </div>

      <div className="mt-7 flex justify-center">
  <button
    type="button"
    onClick={openBookingFlow}
    className="inline-flex h-[52px] items-center justify-center rounded-full bg-white px-8 text-[15px] font-semibold text-[#2f2550] shadow-[0_14px_30px_rgba(25,18,47,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_38px_rgba(25,18,47,0.28)]"
  >
    Book a Session
  </button>
</div>
    </div>
  </div>
</div></div>
{/* HOW IT WORKS SECTION — DESKTOP ONLY */}
<section className="hidden lg:block relative overflow-hidden bg-[linear-gradient(180deg,#fcfaff_0%,#f7f3ff_100%)] py-12 sm:py-20 lg:py-[120px]">
  {/* BACKGROUND GLOWS */}
  <div className="pointer-events-none absolute inset-0">
    <div className="absolute left-[-120px] top-[120px] h-[280px] w-[280px] rounded-full bg-[#efe7ff] blur-[95px]" />
    <div className="absolute right-[-100px] bottom-[100px] h-[260px] w-[260px] rounded-full bg-[#fff3ea] blur-[95px]" />
    <div className="absolute left-[38%] top-[28%] h-[180px] w-[180px] rounded-full bg-[#eefcf8] blur-[85px]" />
  </div>

  <div className="relative z-10 mx-auto max-w-[1240px] px-6">
    {/* HEADER */}
    <div className="mx-auto max-w-[820px] text-center">
      <div className="inline-flex rounded-full border border-[#e8ddff] bg-white px-5 py-2.5 text-[13px] font-semibold uppercase tracking-[0.22em] text-[#7a5ce0] shadow-[0_10px_24px_rgba(122,92,224,0.08)]">
        How It Works
      </div>

      <h2 className="mt-4 text-[26px] font-black leading-[1.08] tracking-[-0.03em] text-[#2a2346] sm:mt-7 sm:text-[40px] md:text-[54px]">
        A calm,
        <span className="text-[#6d5bd0]"> premium grooming </span>
        experience
      </h2>

      <p className="mx-auto mt-3 max-w-[760px] text-[14px] leading-[1.75] text-[#6b7280] sm:mt-5 sm:text-[18px] sm:leading-[1.8]">
        Every step is designed to keep your pet comfortable, safe, and stress-free.
      </p>
    </div>

    {/* PROCESS CARDS */}
    <div className="mt-8 grid gap-4 sm:mt-16 sm:gap-7 lg:grid-cols-4 lg:gap-8">
      {/* STEP 1 */}
      <div className="group relative overflow-hidden rounded-[30px] bg-black/5 border border-[#ebe5ff] bg-white p-4 shadow-[0_20px_60px_rgba(73,44,120,0.06)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_75px_rgba(73,44,120,0.10)] sm:p-7">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#faf8ff] to-white opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[#f4efff] text-[15px] font-bold text-[#6d5bd0]">
              01
            </div>

            <div className="rounded-full bg-[#faf8ff] px-3 py-1.5 text-[12px] font-semibold text-[#6d5bd0]">
              Planning
            </div>
          </div>

          <h3 className="mt-3 text-[17px] font-bold leading-[1.2] text-[#2a2346] sm:mt-6 sm:text-[24px] sm:font-black sm:leading-[1.15]">
            We plan the perfect look before we begin
          </h3>

          <p className="mt-2 text-[13px] leading-[1.65] text-[#6b7280] sm:mt-4 sm:text-[15px] sm:leading-[1.85]">
            Mock styling options are shared with you first, and your groomer is
            fully briefed on the selected look before reaching your home.
          </p>

          <div className="mt-3 flex flex-wrap gap-2 sm:mt-6">
            <span className="rounded-full border border-[#e8ddff] bg-[#faf8ff] px-3 py-1.5 text-[12px] font-medium text-[#5b4bc2]">
              Styling mockups
            </span>
            <span className="rounded-full border border-[#e8ddff] bg-[#faf8ff] px-3 py-1.5 text-[12px] font-medium text-[#5b4bc2]">
              Groomer briefed
            </span>
          </div>
        </div>
      </div>

      {/* STEP 2 */}
      <div className="group relative overflow-hidden rounded-[30px] border border-[#dff3ec] bg-white p-4 shadow-[0_20px_60px_rgba(17,155,115,0.05)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_75px_rgba(17,155,115,0.10)] sm:p-7">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#f7fffc] to-white opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[#eafbf5] text-[15px] font-bold text-[#119b73]">
              02
            </div>

            <div className="rounded-full bg-[#f5fdf9] px-3 py-1.5 text-[12px] font-semibold text-[#119b73]">
              Comfort
            </div>
          </div>

          <h3 className="mt-3 text-[17px] font-bold leading-[1.2] text-[#2a2346] sm:mt-6 sm:text-[24px] sm:font-black sm:leading-[1.15]">
            We take time to earn your pet’s trust
          </h3>

          <p className="mt-2 text-[13px] leading-[1.65] text-[#6b7280] sm:mt-4 sm:text-[15px] sm:leading-[1.85]">
            We spend time calming and bonding with your pet, while our helper
            sanitizes every tool and grooming surface before the session begins.
          </p>

          <div className="mt-3 flex flex-wrap gap-2 sm:mt-6">
            <span className="rounded-full border border-[#dff3ec] bg-[#f5fdf9] px-3 py-1.5 text-[12px] font-medium text-[#11795d]">
              10-minute bonding
            </span>
            <span className="rounded-full border border-[#dff3ec] bg-[#f5fdf9] px-3 py-1.5 text-[12px] font-medium text-[#11795d]">
              Sanitized setup
            </span>
          </div>
        </div>
      </div>

      {/* STEP 3 */}
      <div className="group relative overflow-hidden rounded-[30px] border border-[#efcfba] bg-white p-4 shadow-[0_26px_72px_rgba(234,88,12,0.09)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_34px_90px_rgba(234,88,12,0.13)] sm:p-7">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#fffaf6] to-white opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[#fff4ec] text-[15px] font-bold text-[#ea580c]">
              03
            </div>

            <div className="rounded-full bg-[#fff6ef] px-3 py-1.5 text-[12px] font-semibold text-[#ea580c]">
              Grooming
            </div>
          </div>

          <h3 className="mt-3 text-[17px] font-bold leading-[1.2] text-[#2a2346] sm:mt-6 sm:text-[24px] sm:font-black sm:leading-[1.15]">
            Gentle, premium grooming from start to finish
          </h3>

          <p className="mt-2 text-[13px] leading-[1.65] text-[#6b7280] sm:mt-4 sm:text-[15px] sm:leading-[1.85]">
            From massage and bath to haircut, paw care, ear cleaning, dental
            care, serum, brushing, and finishing — every step is done patiently
            and safely.
          </p>

          <div className="mt-3 flex flex-wrap gap-2 sm:mt-6">
            <span className="rounded-full border border-[#f6e4d5] bg-[#fff6ef] px-3 py-1.5 text-[12px] font-medium text-[#c86f18]">
              Premium sequence
            </span>
            <span className="rounded-full border border-[#f6e4d5] bg-[#fff6ef] px-3 py-1.5 text-[12px] font-medium text-[#c86f18]">
              Stress-free handling
            </span>
          </div>
        </div>
      </div>

      {/* STEP 4 */}
      <div className="group relative overflow-hidden rounded-[30px] border border-[#ebe5ff] bg-white p-4 shadow-[0_20px_60px_rgba(73,44,120,0.06)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_75px_rgba(73,44,120,0.10)] sm:p-7">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#faf8ff] to-white opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[#f4efff] text-[15px] font-bold text-[#6d5bd0]">
              04
            </div>

            <div className="rounded-full bg-[#faf8ff] px-3 py-1.5 text-[12px] font-semibold text-[#6d5bd0]">
              Quality
            </div>
          </div>

          <h3 className="mt-3 text-[17px] font-bold leading-[1.2] text-[#2a2346] sm:mt-6 sm:text-[24px] sm:font-black sm:leading-[1.15]">
            Every session is monitored for quality
          </h3>

          <p className="mt-2 text-[13px] leading-[1.65] text-[#6b7280] sm:mt-4 sm:text-[15px] sm:leading-[1.85]">
            Throughout the service, our backend QA team of senior groomers
            reviews photos and videos in real time to ensure every session meets
            our highest standards.
          </p>

          <div className="mt-3 flex flex-wrap gap-2 sm:mt-6">
            <span className="rounded-full border border-[#e8ddff] bg-[#faf8ff] px-3 py-1.5 text-[12px] font-medium text-[#5b4bc2]">
              Live QA checks
            </span>
            <span className="rounded-full border border-[#e8ddff] bg-[#faf8ff] px-3 py-1.5 text-[12px] font-medium text-[#5b4bc2]">
              Senior supervision
            </span>
          </div>
        </div>
      </div>
    </div>

    {/* REASSURANCE STRIP — UPGRADED */}
<div className="mx-auto mt-8 max-w-[980px] rounded-[28px] border border-[#e9e2ff] bg-[linear-gradient(180deg,#ffffff_0%,#fbf9ff_100%)] px-5 py-6 text-center shadow-[0_25px_70px_rgba(109,91,208,0.08)] sm:mt-14 sm:rounded-[32px] sm:px-6 sm:py-8 md:px-10">

  <div className="text-[18px] font-black tracking-[-0.02em] text-[#2a2346] sm:text-[26px] md:text-[32px]">
    <span className="text-[#6d5bd0]">No cages.</span>{" "}
    <span className="text-[#2a2346]">No rush.</span>{" "}
    <span className="text-[#6d5bd0]">No harsh handling.</span>
  </div>

  <div className="mx-auto mt-3 h-[1px] w-[60px] bg-gradient-to-r from-transparent via-[#dcd3ff] to-transparent sm:mt-5 sm:w-[80px]" />

  <p className="mx-auto mt-3 max-w-[720px] text-[13px] leading-[1.75] text-[#6b7280] sm:mt-5 sm:text-[16px] sm:leading-[1.9] md:text-[17px]">
    Just patient professionals, premium products, and a grooming experience built around your pet.
  </p>

  <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5 sm:mt-6 sm:gap-3">
    <span className="rounded-full border border-[#ece5ff] bg-white px-3.5 py-1.5 text-[12px] font-medium text-[#4b4370] shadow-sm sm:px-4 sm:text-[13px]">
      Stress-free experience
    </span>
    <span className="rounded-full border border-[#ece5ff] bg-white px-3.5 py-1.5 text-[12px] font-medium text-[#4b4370] shadow-sm sm:px-4 sm:text-[13px]">
      Gentle handling
    </span>
    <span className="hidden rounded-full border border-[#ece5ff] bg-white px-4 py-1.5 text-[13px] font-medium text-[#4b4370] shadow-sm sm:inline-flex">
      Pet-first approach
    </span>
  </div>
</div>
</div>
</section>
{/* STYLE PREVIEW BANNER */}
<div className="px-4 py-10 sm:px-6 lg:py-16">
  <div className="mx-auto max-w-[1000px]">
    <div className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#1e1640_0%,#2d1f5e_55%,#1a1338_100%)] px-7 py-9 shadow-[0_24px_60px_rgba(20,10,50,0.20)] sm:px-10 lg:flex lg:items-center lg:justify-between lg:gap-10 lg:px-12 lg:py-10">
      {/* glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-60px] top-[-30px] h-[220px] w-[220px] rounded-full bg-[#7c5ce0]/22 blur-[90px]" />
        <div className="absolute right-[-50px] bottom-[-30px] h-[200px] w-[200px] rounded-full bg-[#c084fc]/12 blur-[80px]" />
      </div>

      <div className="relative z-10 lg:max-w-[520px]">
        <div className="inline-flex items-center rounded-full border border-[#a78bfa]/30 bg-[#a78bfa]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#c4b5fd]">
          Style Preview
        </div>

        <h2 className="mt-4 text-[24px] font-black leading-[1.14] tracking-[-0.03em] text-white sm:text-[28px] lg:text-[32px]">
          See a style that could suit your pet
        </h2>

        <p className="mt-3 text-[14px] leading-[1.65] text-white/65 lg:text-[15px]">
          Share recent photos and get a suggested look before grooming.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => setIsMockupModalOpen(true)}
            className="inline-flex h-[46px] items-center justify-center rounded-full bg-white px-7 text-[14px] font-semibold text-[#2a1f50] shadow-[0_10px_28px_rgba(0,0,0,0.20)] transition hover:-translate-y-0.5"
          >
            Request style mockup
          </button>
          <span className="text-[11px] text-white/40">Book Complete Pampring to get your mock up</span>
        </div>
      </div>

      {/* decorative right — desktop only */}
      <div className="pointer-events-none relative z-10 mt-8 hidden lg:mt-0 lg:flex lg:shrink-0 lg:items-center lg:justify-center">
        <div className="flex h-[120px] w-[120px] items-center justify-center rounded-full border border-white/8 bg-white/5 text-[52px]">
          🐾
        </div>
      </div>
    </div>
  </div>
</div>

{/* STYLE MOCKUP MODAL */}
{isMockupModalOpen ? (
  <div className="fixed inset-0 z-[200] flex items-end justify-center bg-[rgba(17,12,33,0.65)] backdrop-blur-[3px] sm:items-center sm:px-4">
    <div className="w-full max-w-[480px] rounded-t-[28px] bg-white p-7 shadow-[0_-20px_60px_rgba(20,10,50,0.18)] sm:rounded-[28px]">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="inline-flex rounded-full border border-[#ece5ff] bg-[#faf8ff] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6d5bd0]">
          Style Preview
        </div>
        <button
          type="button"
          onClick={() => setIsMockupModalOpen(false)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#ece8f5] bg-[#faf8ff] text-[#2a2346]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <h3 className="text-[22px] font-black leading-[1.15] tracking-[-0.03em] text-[#1f1f2c]">
        Style mockup preview
      </h3>
      <p className="mt-3 text-[14px] leading-[1.75] text-[#6b7280]">
        This preview experience is available with Complete Pampering. Share recent photos and your style preferences, and our team may guide a suggested haircut direction before the session.
      </p>

      <div className="mt-7 flex flex-col gap-3">
        <button
          type="button"
          onClick={() => {
            setIsMockupModalOpen(false);
            setHeroForm((prev) => ({ ...prev, service: "Complete Pampering" }));
            openBookingFlow();
          }}
          className="h-[52px] w-full rounded-[18px] bg-[#6d5bd0] text-[15px] font-semibold text-white shadow-[0_12px_28px_rgba(109,91,208,0.22)]"
        >
          Continue with Complete Pampering
        </button>
        <button
          type="button"
          onClick={() => setIsMockupModalOpen(false)}
          className="h-[48px] w-full rounded-[18px] border border-[#e5e7eb] bg-white text-[14px] font-medium text-[#6b7280]"
        >
          Maybe later
        </button>
      </div>
    </div>
  </div>
) : null}

{/* FAQ SECTION — REDESIGNED */}
<section id="faqs-section" className="relative overflow-hidden bg-[#fcfaff] pt-10 pb-12 sm:py-20 lg:py-[120px]">
  {/* BACKGROUND GLOWS */}
  <div className="pointer-events-none absolute inset-0">
    <div className="absolute left-[-120px] top-[140px] h-[300px] w-[300px] rounded-full bg-[#efe7ff] blur-[100px]" />
    <div className="absolute right-[-100px] bottom-[100px] h-[260px] w-[260px] rounded-full bg-[#fff3ea] blur-[95px]" />
    <div className="absolute left-[42%] bottom-[80px] h-[220px] w-[220px] rounded-full bg-[#f3ecff] blur-[90px]" />
  </div>

  <div className="relative z-10 mx-auto max-w-[1240px] px-4 sm:px-6">

    {/* ══════════════════════════════
        MOBILE FAQ — COMPACT SYSTEM
    ══════════════════════════════ */}
    <div className="lg:hidden">

      {/* COMPACT INTRO */}
      <div className="text-center">
        <div className="inline-flex rounded-full border border-[#e8ddff] bg-white px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7a5ce0] shadow-[0_6px_16px_rgba(122,92,224,0.07)]">
          FAQs
        </div>
        <h2 className="mt-3 text-[24px] font-black leading-[1.06] tracking-[-0.035em] text-[#2a2346]">
          Got questions?<br />We&apos;ve got answers.
        </h2>
        <p className="mx-auto mt-2 max-w-[280px] text-[13px] leading-[1.65] text-[#6b7280]">
          Everything you may want to know before booking — clearly answered.
        </p>
      </div>

      {/* SLIM FIRST-TIME STRIP */}
      <div className="mt-4 flex items-center justify-between gap-3 rounded-[16px] border border-[#ece5ff] bg-white px-4 py-3 shadow-[0_4px_14px_rgba(109,91,208,0.06)]">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-[#2a2346]">First time booking?</div>
          <p className="mt-0.5 text-[11.5px] leading-[1.5] text-[#6b7280]">We&apos;ll help you choose the right package for your pet.</p>
        </div>
        <button
          type="button"
          onClick={() => openWhatsAppChat("Hi All Tails, I'd like to talk to a grooming expert and get help choosing the right package for my pet.")}
          className="shrink-0 rounded-full bg-[#f4efff] px-3.5 py-2 text-[12px] font-semibold text-[#6d5bd0] transition active:scale-95"
        >
          Talk to us →
        </button>
      </div>

      {/* MOBILE ACCORDION LIST */}
      <div className="mt-4 space-y-2">

        {/* FAQ 1 — open by default */}
        <details open className="group rounded-[18px] border border-[#ebe5ff] bg-white p-3 shadow-[0_4px_14px_rgba(73,44,120,0.05)]">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex rounded-full bg-[#f4efff] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6d5bd0]">Comfort</div>
              <div className="mt-1 text-[14px] font-bold leading-[1.3] tracking-[-0.01em] text-[#2a2346]">Will my pet be anxious during grooming?</div>
            </div>
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f7f3ff] text-[#6d5bd0] transition-all duration-300 group-open:rotate-180">
              <span className="text-[13px] leading-none">⌄</span>
            </div>
          </summary>
          <div className="mt-3 h-px w-full bg-[linear-gradient(to_right,transparent,#e9e1ff,transparent)]" />
          <p className="mt-3 text-[13px] leading-[1.75] text-[#6b7280]">
            We begin every session with a calm bonding period. We move at your pet&apos;s pace — no force, no rushing — so they feel safe throughout.
          </p>
        </details>

        {/* FAQ 2 */}
        <details className="group rounded-[18px] border border-[#ebe5ff] bg-white p-3 shadow-[0_4px_14px_rgba(73,44,120,0.05)]">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex rounded-full bg-[#f4efff] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6d5bd0]">Setup</div>
              <div className="mt-1 text-[14px] font-bold leading-[1.3] tracking-[-0.01em] text-[#2a2346]">Do I need to prepare anything at home?</div>
            </div>
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f7f3ff] text-[#6d5bd0] transition-all duration-300 group-open:rotate-180">
              <span className="text-[13px] leading-none">⌄</span>
            </div>
          </summary>
          <div className="mt-3 h-px w-full bg-[linear-gradient(to_right,transparent,#e9e1ff,transparent)]" />
          <p className="mt-3 text-[13px] leading-[1.75] text-[#6b7280]">
            No preparation needed. Our team brings all equipment and products. We only need a small space with access to water and power.
          </p>
        </details>

        {/* FAQ 3 */}
        <details className="group rounded-[18px] border border-[#f4dfcf] bg-white p-3 shadow-[0_4px_14px_rgba(234,88,12,0.04)]">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex rounded-full bg-[#fff5ee] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ea580c]">Timing</div>
              <div className="mt-1 text-[14px] font-bold leading-[1.3] tracking-[-0.01em] text-[#2a2346]">How long does a grooming session take?</div>
            </div>
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#fff5ee] text-[#ea580c] transition-all duration-300 group-open:rotate-180">
              <span className="text-[13px] leading-none">⌄</span>
            </div>
          </summary>
          <div className="mt-3 h-px w-full bg-[linear-gradient(to_right,transparent,#f4dfcf,transparent)]" />
          <p className="mt-3 text-[13px] leading-[1.75] text-[#6b7280]">
            Basic sessions ~60 min, Hygiene ~90 min, Luxury ~120 min. We never rush — patience is central to calm, quality grooming.
          </p>
        </details>

        {/* FAQ 4 */}
        <details className="group rounded-[18px] border border-[#ebe5ff] bg-white p-3 shadow-[0_4px_14px_rgba(73,44,120,0.05)]">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex rounded-full bg-[#f4efff] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6d5bd0]">Inclusions</div>
              <div className="mt-1 text-[14px] font-bold leading-[1.3] tracking-[-0.01em] text-[#2a2346]">What exactly is included in a session?</div>
            </div>
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f7f3ff] text-[#6d5bd0] transition-all duration-300 group-open:rotate-180">
              <span className="text-[13px] leading-none">⌄</span>
            </div>
          </summary>
          <div className="mt-3 h-px w-full bg-[linear-gradient(to_right,transparent,#e9e1ff,transparent)]" />
          <p className="mt-3 text-[13px] leading-[1.75] text-[#6b7280]">
            Sessions include bath, conditioning, blow dry, haircut, paw care, ear cleaning, dental cleaning, serum, brushing, and finishing. All done gently, step by step.
          </p>
        </details>

        {/* FAQ 5 */}
        <details className="group rounded-[18px] border border-[#dff3ec] bg-white p-3 shadow-[0_4px_14px_rgba(17,155,115,0.04)]">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex rounded-full bg-[#f5fdf9] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#119b73]">Safety</div>
              <div className="mt-1 text-[14px] font-bold leading-[1.3] tracking-[-0.01em] text-[#2a2346]">Are your products safe for pets?</div>
            </div>
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f5fdf9] text-[#119b73] transition-all duration-300 group-open:rotate-180">
              <span className="text-[13px] leading-none">⌄</span>
            </div>
          </summary>
          <div className="mt-3 h-px w-full bg-[linear-gradient(to_right,transparent,#dff3ec,transparent)]" />
          <p className="mt-3 text-[13px] leading-[1.75] text-[#6b7280]">
            Yes. We use vet-approved, breed-specific, skin-safe products tailored to your pet&apos;s coat and condition.
          </p>
        </details>

        {/* FAQ 6 */}
        <details className="group rounded-[18px] border border-[#ebe5ff] bg-white p-3 shadow-[0_4px_14px_rgba(73,44,120,0.05)]">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex rounded-full bg-[#f4efff] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6d5bd0]">Handling</div>
              <div className="mt-1 text-[14px] font-bold leading-[1.3] tracking-[-0.01em] text-[#2a2346]">What if my pet is very scared or difficult to handle?</div>
            </div>
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f7f3ff] text-[#6d5bd0] transition-all duration-300 group-open:rotate-180">
              <span className="text-[13px] leading-none">⌄</span>
            </div>
          </summary>
          <div className="mt-3 h-px w-full bg-[linear-gradient(to_right,transparent,#e9e1ff,transparent)]" />
          <p className="mt-3 text-[13px] leading-[1.75] text-[#6b7280]">
            Our groomers are trained to handle anxious pets with patience. If needed, we adapt or slow down. Your pet&apos;s comfort always comes before speed.
          </p>
        </details>

        {/* FAQ 7 */}
        <details className="group rounded-[18px] border border-[#ebe5ff] bg-white p-3 shadow-[0_4px_14px_rgba(73,44,120,0.05)]">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex rounded-full bg-[#f4efff] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6d5bd0]">Quality</div>
              <div className="mt-1 text-[14px] font-bold leading-[1.3] tracking-[-0.01em] text-[#2a2346]">How do you ensure quality during the session?</div>
            </div>
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f7f3ff] text-[#6d5bd0] transition-all duration-300 group-open:rotate-180">
              <span className="text-[13px] leading-none">⌄</span>
            </div>
          </summary>
          <div className="mt-3 h-px w-full bg-[linear-gradient(to_right,transparent,#e9e1ff,transparent)]" />
          <p className="mt-3 text-[13px] leading-[1.75] text-[#6b7280]">
            Every session is monitored by our QA team of senior groomers via photos and videos reviewed in real time.
          </p>
        </details>

        {/* FAQ 8 */}
        <details className="group rounded-[18px] border border-[#ebe5ff] bg-white p-3 shadow-[0_4px_14px_rgba(73,44,120,0.05)]">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex rounded-full bg-[#f4efff] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6d5bd0]">Scheduling</div>
              <div className="mt-1 text-[14px] font-bold leading-[1.3] tracking-[-0.01em] text-[#2a2346]">How often should I book grooming?</div>
            </div>
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f7f3ff] text-[#6d5bd0] transition-all duration-300 group-open:rotate-180">
              <span className="text-[13px] leading-none">⌄</span>
            </div>
          </summary>
          <div className="mt-3 h-px w-full bg-[linear-gradient(to_right,transparent,#e9e1ff,transparent)]" />
          <p className="mt-3 text-[13px] leading-[1.75] text-[#6b7280]">
            Most pets benefit from grooming every 3–5 weeks depending on breed and coat length. Our team can recommend the best schedule.
          </p>
        </details>
      </div>

      {/* EXPERT CTA — BOTTOM */}
      <div className="mt-5 flex items-center gap-3 rounded-[18px] border border-[#e6ddff] bg-white px-4 py-3.5 shadow-[0_4px_16px_rgba(80,60,160,0.06)]">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f4efff] text-lg">💬</span>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-[#2a2346]">Still unsure? Talk to our team</div>
          <p className="mt-0.5 text-[11.5px] text-[#8a90a2]">Get guidance based on your pet&apos;s coat and needs.</p>
        </div>
        <button
          type="button"
          onClick={() => openWhatsAppChat("Hi All Tails, I'd like to talk to a grooming expert and get help choosing the right package for my pet.")}
          className="shrink-0 text-[13px] font-semibold text-[#6d5bd0] transition active:opacity-70"
        >
          →
        </button>
      </div>
    </div>

    {/* ══════════════════════════════
        DESKTOP FAQ — UNCHANGED
    ══════════════════════════════ */}
    <div className="hidden lg:grid items-start gap-14 lg:grid-cols-[0.92fr_1.08fr]">
      {/* LEFT PANEL */}
      <div className="relative rounded-[34px] border border-[#ebe5ff] bg-white/80 p-5 shadow-[0_24px_70px_rgba(73,44,120,0.06)] backdrop-blur-sm sm:p-8 md:p-10 lg:min-h-[860px]">
        <div className="inline-flex rounded-full border border-[#e8ddff] bg-white px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#7a5ce0] shadow-[0_8px_20px_rgba(122,92,224,0.06)]">
          FAQs
        </div>

        <h2 className="mt-4 text-[26px] font-black leading-[1.06] tracking-[-0.035em] text-[#2a2346] sm:mt-6 sm:text-[40px] md:text-[54px]">
          Got questions?
          <br />
          We’ve got answers.
        </h2>

        <p className="mt-3 max-w-[520px] text-[14px] leading-[1.75] text-[#6b7280] sm:mt-5 sm:text-[18px]">
          Everything you may want to know before booking, answered with clarity.
        </p>

        <div className="mt-4 hidden flex-wrap gap-3 sm:flex">
          <span className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-4 py-2 text-[13px] font-medium text-[#4b4370] shadow-sm">
            Comfort-first grooming
          </span>
          <span className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-4 py-2 text-[13px] font-medium text-[#4b4370] shadow-sm">
            Transparent process
          </span>
        </div>

        <div className="mt-8 rounded-[24px] bg-[linear-gradient(135deg,#faf7ff_0%,#fff9f4_100%)] p-5 ring-1 ring-[#f0e9ff]">
          <div className="text-[15px] font-semibold text-[#2a2346]">
            Best if you’re booking for the first time
          </div>
          <p className="mt-2 text-[14px] leading-[1.8] text-[#6b7280]">
            Tell us a little about your pet and we’ll help you choose the right
            package with complete confidence.
          </p>
        </div>
        {/* TALK TO HUMAN CTA */}
<div className="mt-6">
  <button
    type="button"
    onClick={() =>
      openWhatsAppChat(
        "Hi All Tails, I’d like to talk to a grooming expert and get help choosing the right package for my pet."
      )
    }
    className="group inline-flex items-center gap-3 rounded-full border border-[#e6ddff] bg-white px-6 py-3 text-[15px] font-semibold text-[#3d3472] shadow-[0_10px_24px_rgba(80,60,160,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#d6caff] hover:shadow-[0_16px_32px_rgba(80,60,160,0.12)]"
  >
    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f4efff] text-[#6d5bd0] transition-all duration-300 group-hover:scale-105">
      💬
    </span>

    Talk to our team

    <span className="transition-transform duration-300 group-hover:translate-x-1">
      →
    </span>
  </button>

  <p className="mt-3 text-[13px] text-[#8a90a2]">
    Get personalized guidance based on your pet
  </p>
</div>

        {/* DECORATIVE DOG IMAGE */}
        <div className="pointer-events-none relative mt-10 hidden sm:block">
          <div className="absolute left-[36px] top-[60px] h-[180px] w-[180px] rounded-full bg-[#ffe7a6]/30 blur-[45px]" />
          <Image
            src="/images/faq-dog.png"
            alt="Friendly dog illustration"
            width={420}
            height={420}
            className="relative w-[260px] md:w-[320px] lg:w-[360px] rotate-[-4deg] object-contain drop-shadow-[0_20px_40px_rgba(42,35,70,0.10)]"
          />
        </div>
      </div>

      {/* RIGHT PANEL — FAQ LIST */}
      <div className="space-y-5">
        {/* FAQ 1 */}
        <details className="group rounded-[24px] border border-[#ebe5ff] bg-white/95 p-4 shadow-[0_20px_60px_rgba(73,44,120,0.06)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_26px_75px_rgba(73,44,120,0.09)] open:shadow-[0_30px_80px_rgba(73,44,120,0.10)] sm:rounded-[28px] sm:p-6 md:p-7">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-5">
            <div>
              <div className="inline-flex rounded-full bg-[#f4efff] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6d5bd0]">
                Comfort
              </div>
              <div className="mt-2 text-[15px] font-bold leading-[1.35] tracking-[-0.01em] text-[#2a2346] sm:mt-4 sm:text-[24px] sm:font-black sm:leading-[1.25] sm:tracking-[-0.02em]">
                Will my pet be anxious during grooming?
              </div>
            </div>

            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f7f3ff] text-[#6d5bd0] transition-all duration-300 group-open:rotate-180 sm:mt-1 sm:h-10 sm:w-10">
              <span className="text-[16px] leading-none sm:text-[18px]">⌄</span>
            </div>
          </summary>

          <div className="mt-5 h-px w-full bg-[linear-gradient(to_right,transparent,#e9e1ff,transparent)]" />

          <p className="mt-5 text-[16px] leading-[1.95] text-[#6b7280]">
            We begin every session with a calm bonding period where the groomer
            gently familiarizes themselves with your pet. We move at your pet’s
            pace—no force, no rushing—so they feel safe and comfortable throughout.
          </p>
        </details>

        {/* FAQ 2 */}
        <details className="group rounded-[24px] border border-[#ebe5ff] bg-white/95 p-4 shadow-[0_20px_60px_rgba(73,44,120,0.06)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_26px_75px_rgba(73,44,120,0.09)] open:shadow-[0_30px_80px_rgba(73,44,120,0.10)] sm:rounded-[28px] sm:p-6 md:p-7">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-5">
            <div>
              <div className="inline-flex rounded-full bg-[#f4efff] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6d5bd0]">
                Setup
              </div>
              <div className="mt-2 text-[15px] font-bold leading-[1.35] tracking-[-0.01em] text-[#2a2346] sm:mt-4 sm:text-[24px] sm:font-black sm:leading-[1.25] sm:tracking-[-0.02em]">
                Do I need to prepare anything at home?
              </div>
            </div>

            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f7f3ff] text-[#6d5bd0] transition-all duration-300 group-open:rotate-180 sm:mt-1 sm:h-10 sm:w-10">
              <span className="text-[16px] leading-none sm:text-[18px]">⌄</span>
            </div>
          </summary>

          <div className="mt-5 h-px w-full bg-[linear-gradient(to_right,transparent,#e9e1ff,transparent)]" />

          <p className="mt-5 text-[16px] leading-[1.95] text-[#6b7280]">
            No preparation is needed. Our team brings all equipment, products,
            and setup required for the session. We only need a small space with
            access to water and power.
          </p>
        </details>

        {/* FAQ 3 */}
        <details className="group rounded-[24px] border border-[#f4dfcf] bg-white/95 p-4 shadow-[0_20px_60px_rgba(234,88,12,0.05)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_26px_75px_rgba(234,88,12,0.08)] open:shadow-[0_30px_80px_rgba(234,88,12,0.09)] sm:rounded-[28px] sm:p-6 md:p-7">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-5">
            <div>
              <div className="inline-flex rounded-full bg-[#fff5ee] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ea580c]">
                Timing
              </div>
              <div className="mt-2 text-[15px] font-bold leading-[1.35] tracking-[-0.01em] text-[#2a2346] sm:mt-4 sm:text-[24px] sm:font-black sm:leading-[1.25] sm:tracking-[-0.02em]">
                How long does a grooming session take?
              </div>
            </div>

            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fff5ee] text-[#ea580c] transition-all duration-300 group-open:rotate-180 sm:mt-1 sm:h-10 sm:w-10">
              <span className="text-[16px] leading-none sm:text-[18px]">⌄</span>
            </div>
          </summary>

          <div className="mt-5 h-px w-full bg-[linear-gradient(to_right,transparent,#f4dfcf,transparent)]" />

          <p className="mt-5 text-[16px] leading-[1.95] text-[#6b7280]">
            It depends on the package selected. Basic sessions usually take around
            <span className="font-semibold text-[#2a2346]"> 60 minutes</span>,
            Hygiene sessions around
            <span className="font-semibold text-[#2a2346]"> 90 minutes</span>, and
            Luxury sessions around
            <span className="font-semibold text-[#2a2346]"> 120 minutes</span>.
            We never rush—patience is the key to anxiety-free grooming and finesse.
          </p>
        </details>

        {/* FAQ 4 */}
        <details className="group rounded-[24px] border border-[#ebe5ff] bg-white/95 p-4 shadow-[0_20px_60px_rgba(73,44,120,0.06)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_26px_75px_rgba(73,44,120,0.09)] open:shadow-[0_30px_80px_rgba(73,44,120,0.10)] sm:rounded-[28px] sm:p-6 md:p-7">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-5">
            <div>
              <div className="inline-flex rounded-full bg-[#f4efff] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6d5bd0]">
                Inclusions
              </div>
              <div className="mt-2 text-[15px] font-bold leading-[1.35] tracking-[-0.01em] text-[#2a2346] sm:mt-4 sm:text-[24px] sm:font-black sm:leading-[1.25] sm:tracking-[-0.02em]">
                What exactly is included in a session?
              </div>
            </div>

            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f7f3ff] text-[#6d5bd0] transition-all duration-300 group-open:rotate-180 sm:mt-1 sm:h-10 sm:w-10">
              <span className="text-[16px] leading-none sm:text-[18px]">⌄</span>
            </div>
          </summary>

          <div className="mt-5 h-px w-full bg-[linear-gradient(to_right,transparent,#e9e1ff,transparent)]" />

          <p className="mt-5 text-[16px] leading-[1.95] text-[#6b7280]">
            Depending on the package, sessions may include bath, conditioning,
            blow dry, haircut or styling, paw care, ear cleaning, dental cleaning,
            serum, brushing, and finishing touches. Everything is done gently,
            step by step, and with your pet’s comfort in mind.
          </p>
        </details>

        {/* FAQ 5 */}
        <details className="group rounded-[24px] border border-[#dff3ec] bg-white/95 p-4 shadow-[0_20px_60px_rgba(17,155,115,0.05)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_26px_75px_rgba(17,155,115,0.08)] open:shadow-[0_30px_80px_rgba(17,155,115,0.09)] sm:rounded-[28px] sm:p-6 md:p-7">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-5">
            <div>
              <div className="inline-flex rounded-full bg-[#f5fdf9] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#119b73]">
                Safety
              </div>
              <div className="mt-2 text-[15px] font-bold leading-[1.35] tracking-[-0.01em] text-[#2a2346] sm:mt-4 sm:text-[24px] sm:font-black sm:leading-[1.25] sm:tracking-[-0.02em]">
                Are your products safe for pets?
              </div>
            </div>

            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f5fdf9] text-[#119b73] transition-all duration-300 group-open:rotate-180 sm:mt-1 sm:h-10 sm:w-10">
              <span className="text-[16px] leading-none sm:text-[18px]">⌄</span>
            </div>
          </summary>

          <div className="mt-5 h-px w-full bg-[linear-gradient(to_right,transparent,#dff3ec,transparent)]" />

          <p className="mt-5 text-[16px] leading-[1.95] text-[#6b7280]">
            Absolutely. We use vet-approved, breed-specific, and skin-safe
            products tailored to your pet’s coat and condition.
          </p>
        </details>

        {/* FAQ 6 */}
        <details className="group rounded-[24px] border border-[#ebe5ff] bg-white/95 p-4 shadow-[0_20px_60px_rgba(73,44,120,0.06)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_26px_75px_rgba(73,44,120,0.09)] open:shadow-[0_30px_80px_rgba(73,44,120,0.10)] sm:rounded-[28px] sm:p-6 md:p-7">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-5">
            <div>
              <div className="inline-flex rounded-full bg-[#f4efff] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6d5bd0]">
                Handling
              </div>
              <div className="mt-2 text-[15px] font-bold leading-[1.35] tracking-[-0.01em] text-[#2a2346] sm:mt-4 sm:text-[24px] sm:font-black sm:leading-[1.25] sm:tracking-[-0.02em]">
                What if my pet is very scared or difficult to handle?
              </div>
            </div>

            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f7f3ff] text-[#6d5bd0] transition-all duration-300 group-open:rotate-180 sm:mt-1 sm:h-10 sm:w-10">
              <span className="text-[16px] leading-none sm:text-[18px]">⌄</span>
            </div>
          </summary>

          <div className="mt-5 h-px w-full bg-[linear-gradient(to_right,transparent,#e9e1ff,transparent)]" />

          <p className="mt-5 text-[16px] leading-[1.95] text-[#6b7280]">
            Our groomers are trained to handle anxious pets with patience and
            care. If needed, we adapt the session or slow down further. Your pet’s
            comfort always comes before speed.
          </p>
        </details>

        {/* FAQ 7 */}
        <details className="group rounded-[24px] border border-[#ebe5ff] bg-white/95 p-4 shadow-[0_20px_60px_rgba(73,44,120,0.06)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_26px_75px_rgba(73,44,120,0.09)] open:shadow-[0_30px_80px_rgba(73,44,120,0.10)] sm:rounded-[28px] sm:p-6 md:p-7">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-5">
            <div>
              <div className="inline-flex rounded-full bg-[#f4efff] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6d5bd0]">
                Quality
              </div>
              <div className="mt-2 text-[15px] font-bold leading-[1.35] tracking-[-0.01em] text-[#2a2346] sm:mt-4 sm:text-[24px] sm:font-black sm:leading-[1.25] sm:tracking-[-0.02em]">
                How do you ensure quality during the session?
              </div>
            </div>

            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f7f3ff] text-[#6d5bd0] transition-all duration-300 group-open:rotate-180 sm:mt-1 sm:h-10 sm:w-10">
              <span className="text-[16px] leading-none sm:text-[18px]">⌄</span>
            </div>
          </summary>

          <div className="mt-5 h-px w-full bg-[linear-gradient(to_right,transparent,#e9e1ff,transparent)]" />

          <p className="mt-5 text-[16px] leading-[1.95] text-[#6b7280]">
            Every session is monitored by our QA team of senior groomers. Photos
            and videos are reviewed in real time so we can maintain consistent,
            premium-quality grooming standards.
          </p>
        </details>

        {/* FAQ 8 */}
        <details className="group rounded-[24px] border border-[#ebe5ff] bg-white/95 p-4 shadow-[0_20px_60px_rgba(73,44,120,0.06)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_26px_75px_rgba(73,44,120,0.09)] open:shadow-[0_30px_80px_rgba(73,44,120,0.10)] sm:rounded-[28px] sm:p-6 md:p-7">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-5">
            <div>
              <div className="inline-flex rounded-full bg-[#f4efff] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6d5bd0]">
                Scheduling
              </div>
              <div className="mt-2 text-[15px] font-bold leading-[1.35] tracking-[-0.01em] text-[#2a2346] sm:mt-4 sm:text-[24px] sm:font-black sm:leading-[1.25] sm:tracking-[-0.02em]">
                How often should I book grooming?
              </div>
            </div>

            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f7f3ff] text-[#6d5bd0] transition-all duration-300 group-open:rotate-180 sm:mt-1 sm:h-10 sm:w-10">
              <span className="text-[16px] leading-none sm:text-[18px]">⌄</span>
            </div>
          </summary>

          <div className="mt-5 h-px w-full bg-[linear-gradient(to_right,transparent,#e9e1ff,transparent)]" />

          <p className="mt-5 text-[16px] leading-[1.95] text-[#6b7280]">
            Most pets benefit from grooming every 3–5 weeks, depending on breed,
            coat length, and lifestyle. If you’re unsure, our team can recommend
            the best schedule for your pet.
          </p>
        </details>
           </div>
    </div>
  </div>
</section>

{/* BLOG / RESOURCES SECTION */}
<section className="relative overflow-hidden bg-white pt-10 pb-12 lg:py-[130px]">
  {/* BACKGROUND GLOWS */}
  <div className="pointer-events-none absolute inset-0">
    <div className="absolute left-[-120px] top-[120px] h-[280px] w-[280px] rounded-full bg-[#f3ecff] blur-[95px]" />
    <div className="absolute right-[-100px] bottom-[100px] h-[260px] w-[260px] rounded-full bg-[#fff3ea] blur-[95px]" />
  </div>

  <div className="relative z-10 mx-auto max-w-[1240px] px-4 sm:px-6">
    {/* HEADER */}
    <div className="mx-auto max-w-[860px] text-center">
      <div className="inline-flex rounded-full border border-[#e8ddff] bg-white px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#7a5ce0] shadow-[0_8px_18px_rgba(122,92,224,0.07)] sm:px-5 sm:py-2.5 sm:text-[13px]">
        Expert Tips for Pet Parents
      </div>

      <h2 className="mt-3 text-[24px] font-black leading-[1.08] tracking-[-0.03em] text-[#2a2346] sm:mt-5 sm:text-[32px] lg:mt-7 lg:text-[40px]">
        Helpful reads for healthier coats
        <span className="hidden lg:inline"><br />and happier pets</span>
      </h2>

      <p className="mx-auto mt-2 max-w-[300px] text-[13px] leading-[1.7] text-[#6b7280] sm:mt-4 sm:max-w-[600px] sm:text-[16px] lg:mt-5 lg:max-w-[760px] lg:text-[18px] lg:leading-[1.85]">
        Grooming advice, coat care guidance, and practical tips from the All Tails care team.
      </p>
    </div>

    {/* BLOG GRID */}
    {blogPosts.length > 0 ? (
      <div className="mt-5 grid gap-4 sm:mt-10 sm:gap-6 lg:mt-18 lg:gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="group relative overflow-hidden rounded-[24px] border border-[#ebe5ff] bg-white shadow-[0_12px_36px_rgba(73,44,120,0.07)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(73,44,120,0.10)] sm:rounded-[30px] lg:rounded-[34px] lg:shadow-[0_28px_80px_rgba(73,44,120,0.08)]">
          <div className="relative h-[190px] w-full overflow-hidden sm:h-[260px] md:h-[320px] lg:h-[380px]">
            <Image
              src={blogPosts[0].coverImageUrl || "/images/blog-1.jpeg"}
              alt={blogPosts[0].title}
              fill
              unoptimized
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(21,14,45,0.42),rgba(21,14,45,0.02))]" />
            <div className="absolute left-4 top-4 sm:left-6 sm:top-6">
              <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/90 backdrop-blur-sm sm:px-4 sm:py-2 sm:text-[12px]">
                {blogPosts[0].category || "All Tails"}
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 lg:p-8">
            <div className="text-[11px] font-medium text-[#8a84a3] sm:text-[13px]">
              {blogPosts[0].readTimeMinutes} min read
            </div>
            <h3 className="mt-2 text-[17px] font-black leading-[1.2] tracking-[-0.02em] text-[#2a2346] sm:mt-3 sm:text-[22px] lg:text-[28px] lg:leading-[1.16]">
              {blogPosts[0].title}
            </h3>
            <p className="mt-2 text-[12.5px] leading-[1.75] text-[#6b7280] sm:mt-3 sm:text-[14px] lg:mt-4 lg:max-w-[620px] lg:text-[16px] lg:leading-[1.9]">
              {blogPosts[0].excerpt}
            </p>
            <div className="mt-4 lg:mt-7">
              <a href={`/blogs/${blogPosts[0].slug}`} className="inline-flex items-center gap-1.5 rounded-full bg-[#f4efff] px-4 py-2 text-[12px] font-semibold text-[#5f4fc2] transition hover:bg-[#ebe3ff] sm:px-5 sm:py-2.5 sm:text-[14px]">
                Read article <span>→</span>
              </a>
            </div>
          </div>
        </article>

        <div className="grid gap-4 sm:gap-5 lg:gap-8">
          {blogPosts.slice(1, 3).map((post, index) => (
            <article key={post.id} className={`group relative overflow-hidden rounded-[20px] border bg-white shadow-[0_8px_24px_rgba(73,44,120,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_36px_rgba(73,44,120,0.09)] sm:rounded-[26px] lg:rounded-[32px] lg:shadow-[0_22px_70px_rgba(73,44,120,0.07)] ${index === 1 ? "border-[#f4dfcf]" : "border-[#ebe5ff]"}`}>
              <div className="relative h-[130px] w-full overflow-hidden sm:h-[170px] lg:h-[220px]">
                <Image
                  src={post.coverImageUrl || `/images/blog-${index + 2}.jpeg`}
                  alt={post.title}
                  fill
                  unoptimized
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
              </div>
              <div className="p-4 sm:p-5 lg:p-6">
                <div className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] sm:px-3 sm:py-1.5 sm:text-[11px] ${index === 1 ? "bg-[#fff5ee] text-[#ea580c]" : "bg-[#f4efff] text-[#6d5bd0]"}`}>
                  {post.category || "All Tails"}
                </div>
                <h3 className="mt-2 text-[15px] font-black leading-[1.25] tracking-[-0.02em] text-[#2a2346] sm:text-[18px] lg:mt-4 lg:text-[24px]">
                  {post.title}
                </h3>
                <p className="mt-1.5 text-[12px] leading-[1.7] text-[#6b7280] sm:mt-2 sm:text-[13px] lg:mt-3 lg:text-[15px] lg:leading-[1.85]">
                  {post.excerpt}
                </p>
                <div className="mt-3 lg:mt-6">
                  <a href={`/blogs/${post.slug}`} className={`inline-flex items-center gap-1 text-[12px] font-semibold transition sm:text-[14px] ${index === 1 ? "text-[#ea580c] hover:text-[#cf4f09]" : "text-[#6d5bd0] hover:text-[#5f4fc2]"}`}>
                    Read article <span>→</span>
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    ) : null}

    {/* BOTTOM CTA */}
    <div className="mt-6 text-center sm:mt-10 lg:mt-14">
      <Link href="/blogs" className="inline-flex h-[44px] items-center justify-center rounded-full bg-[#6d5bd0] px-7 text-[14px] font-semibold text-white shadow-[0_10px_24px_rgba(109,91,208,0.16)] transition hover:bg-[#5f4fc2] sm:h-[52px] sm:px-8 sm:text-[15px] lg:shadow-[0_14px_30px_rgba(109,91,208,0.18)] lg:hover:-translate-y-0.5">
        View All Articles
      </Link>
    </div>
  </div>
</section>

{/* FINAL CTA BANNER — removed from mobile */}
<div className="hidden">
  <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,#6f5bd2_0%,#5d49c5_52%,#4a379f_100%)] px-6 py-8 shadow-[0_28px_80px_rgba(77,47,122,0.18)]">
    <div className="pointer-events-none absolute inset-0 rounded-[32px] ring-1 ring-white/10" />
    <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-white/20" />
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute left-[-60px] top-1/2 h-[220px] w-[220px] -translate-y-1/2 rounded-full bg-[#8e7be8]/35 blur-[85px]" />
      <div className="absolute right-[-40px] top-1/2 h-[200px] w-[200px] -translate-y-1/2 rounded-full bg-[#ffb58d]/18 blur-[80px]" />
    </div>
    <div className="relative z-10 mx-auto max-w-[680px] text-center">
      <div className="inline-flex rounded-full border border-white/14 bg-white/10 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-white/85 backdrop-blur-sm">
        Premium At-Home Grooming
      </div>
      <h3 className="mt-5 text-[28px] font-black leading-[1.14] tracking-[-0.035em] text-white">
        Your pet
        <br />
        <span className="bg-gradient-to-r from-[#ff8a5b] via-[#ffb15c] to-[#ffd166] bg-clip-text text-transparent">
          deserves more
        </span>
        <span className="text-white"> than a basic groom.</span>
      </h3>
      <p className="mx-auto mt-3 max-w-[560px] text-[15px] leading-[1.8] text-white/82">
        Premium at-home care, handled gently by experts they can trust.
      </p>
      <div className="mt-7 flex justify-center">
        <button
          type="button"
          onClick={openBookingFlow}
          className="inline-flex h-[52px] items-center justify-center rounded-full bg-white px-8 text-[15px] font-semibold text-[#2f2550] shadow-[0_14px_30px_rgba(25,18,47,0.22)] transition-all duration-300 active:scale-95"
        >
          Book a Session
        </button>
      </div>
    </div>
  </div>
</div>

{/* PACKAGE INCLUSIONS MODAL */}
{inclusionsPackage && (() => {
  const pkg = PACKAGES.find((p) => p.name === inclusionsPackage);
  if (!pkg) return null;
  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center lg:items-center bg-[rgba(17,12,33,0.55)] backdrop-blur-[3px]"
      onClick={closeInclusions}
    >
      <div
        className="relative w-full max-h-[88vh] overflow-y-auto rounded-t-[32px] bg-white px-5 pb-8 pt-5 shadow-[0_-20px_80px_rgba(0,0,0,0.18)] lg:max-w-[560px] lg:rounded-[32px] lg:px-8 lg:pb-10 lg:pt-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* handle */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#e2dff0] lg:hidden" />

        {/* close */}
        <button
          type="button"
          onClick={closeInclusions}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-[#e8e4f5] bg-[#faf8ff] text-[#6b5fc4] text-[16px] transition hover:bg-[#f0ebff] lg:right-6 lg:top-6"
        >
          ✕
        </button>

        {/* plan label + price */}
        <div className={`inline-flex rounded-full px-3 py-1.5 text-[12px] font-semibold ${pkg.pillBg} ${pkg.pillText}`}>
          {pkg.name}
        </div>
        <div className={`mt-2 text-[36px] font-black leading-none ${pkg.priceCls}`}>
          ₹{pkg.price}
        </div>

        {/* overview */}
        <p className="mt-3 text-[14px] leading-[1.75] text-[#6b7280]">{pkg.overview}</p>

        {/* best for */}
        <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9da3b0]">{pkg.bestFor}</p>

        <div className={`mt-5 h-px w-full ${pkg.divider}`} />

        {/* inclusions list */}
        <div className="mt-4">
          <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9da3b0]">What&apos;s included</div>
          <ul className="mt-3 space-y-2.5">
            {pkg.inclusions.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[14px] text-[#2f2f39]">
                <span className={`mt-0.5 text-[13px] ${pkg.checkColor}`}>✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={`mt-5 h-px w-full ${pkg.divider}`} />

        {/* notes */}
        <div className="mt-4 space-y-3">
          {pkg.notes.map((note) => (
            <p key={note} className="text-[12.5px] leading-[1.7] text-[#8b90a0]">{note}</p>
          ))}
        </div>

        {/* CTA */}
<button
  type="button"
  onClick={() => { closeInclusions(); handlePackageBookNow(pkg.name); }}
  className={`mt-6 flex h-[50px] w-full items-center justify-center rounded-[18px] text-[15px] font-semibold leading-none transition ${pkg.btnCls}`}
>
  <span className="leading-none">{pkg.ctaLabel}</span>
</button>
      </div>
    </div>
  );
})()}
{/* PLAN DETAILS MODAL */}
{planDetailsPackage && (() => {
  const plan: PlanPackage | undefined = PLANS.find(
  (p) => p.name === planDetailsPackage
);
  if (!plan) return null;

  return (
    <div
      className="fixed inset-0 z-[121] flex items-end justify-center bg-[rgba(17,12,33,0.55)] backdrop-blur-[3px] lg:items-center"
      onClick={closePlanDetails}
    >
      <div
        className="relative w-full max-h-[88vh] overflow-y-auto rounded-t-[32px] bg-white px-5 pb-8 pt-5 shadow-[0_-20px_80px_rgba(0,0,0,0.18)] lg:max-w-[560px] lg:rounded-[32px] lg:px-8 lg:pb-10 lg:pt-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* handle */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#e2dff0] lg:hidden" />

        {/* close */}
        <button
          type="button"
          onClick={closePlanDetails}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-[#e8e4f5] bg-[#faf8ff] text-[16px] text-[#6b5fc4] transition hover:bg-[#f0ebff] lg:right-6 lg:top-6"
        >
          ✕
        </button>

        {/* plan label + price */}
        <div className={`inline-flex rounded-full px-3 py-1.5 text-[12px] font-semibold ${plan.pillBg} ${plan.pillText}`}>
          {plan.name}
        </div>
        <div className={`mt-2 text-[36px] font-black leading-none ${plan.priceCls}`}>
          ₹{plan.price}
        </div>

        {/* overview */}
        <p className="mt-3 text-[14px] leading-[1.75] text-[#6b7280]">
          {plan.overview}
        </p>

        {/* best for */}
        <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9da3b0]">
          {plan.bestFor}
        </p>

        <div className={`mt-5 h-px w-full ${plan.divider}`} />

        {/* inclusions list */}
        <div className="mt-4">
          <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9da3b0]">
            What the plan supports over time
          </div>
          <ul className="mt-3 space-y-2.5">
            {plan.inclusions.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-[14px] text-[#2f2f39]"
              >
                <span className={`mt-0.5 text-[13px] ${plan.checkColor}`}>✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={`mt-5 h-px w-full ${plan.divider}`} />

        {/* notes */}
        <div className="mt-4 space-y-3">
          {plan.notes.map((note) => (
            <p
              key={note}
              className="text-[12.5px] leading-[1.7] text-[#8b90a0]"
            >
              {note}
            </p>
          ))}
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={() => {
            closePlanDetails();
            handlePackageBookNow(plan.name);
          }}
          className={`mt-6 flex h-[50px] w-full items-center justify-center rounded-[18px] text-[15px] font-semibold leading-none transition ${plan.btnCls}`}
        >
          <span className="leading-none">{plan.ctaLabel}</span>
        </button>
      </div>
    </div>
  );
})()}
{/* FOOTER — RICH BRAND */}
<footer
  id="contact-section"
  className="relative overflow-hidden bg-[linear-gradient(180deg,#2f2550_0%,#241c40_100%)] pt-10 lg:pt-[110px] text-white"
>
  {/* BACKGROUND GLOWS */}
  <div className="pointer-events-none absolute inset-0">
    <div className="absolute left-[-120px] top-[80px] h-[280px] w-[280px] rounded-full bg-[#6d5bd0]/25 blur-[100px]" />
    <div className="absolute right-[-100px] top-[120px] h-[260px] w-[260px] rounded-full bg-[#ffb58d]/12 blur-[100px]" />
    <div className="absolute bottom-[40px] left-[40%] h-[220px] w-[220px] rounded-full bg-[#5b49b8]/20 blur-[90px]" />
  </div>

  <div className="relative z-10 mx-auto max-w-[1240px] px-6">
    {/* ── MOBILE FOOTER ── */}
    <div className="lg:hidden">
      {/* COMPACT CTA CARD */}
      <div className="rounded-[24px] border border-white/10 bg-white/[0.07] p-5 shadow-[0_16px_48px_rgba(0,0,0,0.18)]">
        <h3 className="text-[20px] font-black leading-[1.22] tracking-[-0.02em] text-white">
          Ready to book your pet’s next grooming session?
        </h3>
        <p className="mt-2 text-[13px] leading-[1.7] text-white/68">
          Calm handling, premium products, and expert care delivered to your doorstep.
        </p>
        <div className="mt-4 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={openBookingFlow}
            className="flex h-[46px] items-center justify-center rounded-full bg-white text-[14px] font-semibold text-[#2f2550] shadow-[0_10px_24px_rgba(0,0,0,0.18)] active:scale-[0.98]"
          >
            Book a Session
          </button>
          <button
            type="button"
            onClick={() =>
              openWhatsAppChat(
                "Hi All Tails, I’d like to talk to a grooming expert before booking a session."
              )
            }
            className="flex h-[42px] items-center justify-center rounded-full border border-white/20 text-[14px] font-medium text-white/80 active:scale-[0.98]"
          >
            Talk to an expert
          </button>
        </div>
      </div>

      {/* REACH US */}
      <div className="mt-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
          Reach Us
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] text-white/78">
          <div>+91 95600 98105</div>
          <div>hello@alltails.in</div>
          <div>Delhi NCR</div>
          <div>Open 9 AM – 8 PM</div>
        </div>
      </div>

      {/* EXPLORE ACCORDION */}
      <details className="group mt-4 border-t border-white/8">
        <summary className="flex cursor-pointer list-none items-center justify-between py-3.5 text-[13px] font-semibold uppercase tracking-[0.18em] text-white/70 [&::-webkit-details-marker]:hidden">
          Explore
          <svg
            className="h-4 w-4 text-white/40 transition-transform duration-200 group-open:rotate-180"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="flex flex-col gap-3 pb-3.5">
          <button
            type="button"
            onClick={() => scrollToSection("home-section")}
            className="text-left text-[14px] text-white/72"
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => scrollToSection("packages-section")}
            className="text-left text-[14px] text-white/72"
          >
            Grooming Plans
          </button>
          <button
            type="button"
            onClick={() => scrollToSection("why-trust-us-section")}
            className="text-left text-[14px] text-white/72"
          >
            How It Works
          </button>
          <button
            type="button"
            onClick={() => scrollToSection("faqs-section")}
            className="text-left text-[14px] text-white/72"
          >
            FAQs
          </button>
          <button
            type="button"
            onClick={() => scrollToSection("contact-section")}
            className="text-left text-[14px] text-white/72"
          >
            Contact
          </button>
        </div>
      </details>

      {/* SERVICES ACCORDION */}
      <details className="group border-t border-white/8">
        <summary className="flex cursor-pointer list-none items-center justify-between py-3.5 text-[13px] font-semibold uppercase tracking-[0.18em] text-white/70 [&::-webkit-details-marker]:hidden">
          Services
          <svg
            className="h-4 w-4 text-white/40 transition-transform duration-200 group-open:rotate-180"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="flex flex-col gap-3 pb-3.5">
          <button type="button" onClick={() => scrollToSection("packages-section")} className="text-left text-[14px] text-white/72">Basic Grooming</button>
          <button type="button" onClick={() => scrollToSection("packages-section")} className="text-left text-[14px] text-white/72">Hygiene Grooming</button>
          <button type="button" onClick={() => scrollToSection("packages-section")} className="text-left text-[14px] text-white/72">Luxury Grooming</button>
          <button type="button" onClick={() => scrollToSection("add-ons-section")} className="text-left text-[14px] text-white/72">Add-ons</button>
        </div>
      </details>

      {/* FOLLOW US — COMPACT PILL ROW */}
      <div className="border-t border-white/8 pt-4 mt-0">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
          Connect
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={WHATSAPP_HREF}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-white/12 bg-white/[0.07] px-3 py-1.5 text-[12px] text-white/78"
          >
            WhatsApp
          </a>
          <a
            href={SUPPORT_PHONE_HREF}
            className="rounded-full border border-white/12 bg-white/[0.07] px-3 py-1.5 text-[12px] text-white/78"
          >
            Call
          </a>
          <a
            href={SUPPORT_EMAIL_HREF}
            className="rounded-full border border-white/12 bg-white/[0.07] px-3 py-1.5 text-[12px] text-white/78"
          >
            Email
          </a>
          <button
            type="button"
            onClick={openTrackBookingModal}
            className="rounded-full border border-white/12 bg-white/[0.07] px-3 py-1.5 text-[12px] text-white/78"
          >
            My Bookings
          </button>
        </div>
      </div>
    </div>

    {/* ── DESKTOP FOOTER ── */}
    <div className="hidden lg:block">
      {/* MAIN FOOTER CARD */}
      <div className="rounded-[36px] border border-white/10 bg-white/5 p-8 shadow-[0_28px_80px_rgba(0,0,0,0.20)] backdrop-blur-sm md:p-10 lg:p-12">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
          {/* LEFT SIDE */}
          <div>
            <div className="relative h-[64px] w-[240px] md:h-[72px] md:w-[280px]">
              <Image
                src="/images/logo-1.png"
                alt="All Tails"
                fill
                className="object-contain object-left opacity-95 drop-shadow-[0_2px_6px_rgba(0,0,0,0.25)]"
              />
            </div>

            <p className="mt-5 max-w-[420px] text-[18px] leading-[1.9] text-white/78">
              Premium at-home grooming, designed around your pet — with calm
              handling, expert care, and a stress-free experience from start to finish.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-[13px] font-medium text-white/82">
                4.9 rated
              </span>
              <span className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-[13px] font-medium text-white/82">
                5000+ sessions
              </span>
              <span className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-[13px] font-medium text-white/82">
                In-house teams only
              </span>
            </div>

            {/* CTA PANEL */}
            <div className="mt-8 rounded-[28px] border border-white/8 bg-white/[0.06] p-6">
              <div className="text-[24px] font-black leading-[1.2] tracking-[-0.02em] text-white">
                Ready to book your pet’s next grooming session?
              </div>

              <p className="mt-3 max-w-[500px] text-[15px] leading-[1.85] text-white/72">
                Calm handling, premium products, and expert care delivered right to your doorstep.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={openBookingFlow}
                  className="inline-flex h-[50px] items-center justify-center rounded-full bg-white px-7 text-[15px] font-semibold text-[#2f2550] shadow-[0_12px_26px_rgba(0,0,0,0.20)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(0,0,0,0.26)]"
                >
                  Book a Session
                </button>

                <button
                  type="button"
                  onClick={() =>
                    openWhatsAppChat(
                      "Hi All Tails, I’d like to talk to a grooming expert before booking a session."
                    )
                  }
                  className="inline-flex h-[50px] items-center justify-center rounded-full border border-white/20 bg-transparent px-7 text-[15px] font-semibold text-white/80 transition-all duration-300 hover:bg-white/10 hover:text-white"
                >
                  Talk to a Grooming Expert
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="grid gap-10 sm:grid-cols-2">
            {/* EXPLORE */}
            <div>
              <div className="text-[13px] font-semibold uppercase tracking-[0.18em] text-white/70">
                Explore
              </div>

              <div className="mt-5 space-y-3">
                <button
                  type="button"
                  onClick={() => scrollToSection("home-section")}
                  className="block text-left text-[16px] text-white/82 transition duration-300 hover:translate-x-[2px] hover:text-white/95"
                >
                  Home
                </button>

                <button
                  type="button"
                  onClick={() => scrollToSection("packages-section")}
                  className="block text-left text-[16px] text-white/82 transition duration-300 hover:translate-x-[2px] hover:text-white/95"
                >
                  Grooming Plans
                </button>

                <button
                  type="button"
                  onClick={() => scrollToSection("why-trust-us-section")}
                  className="block text-left text-[16px] text-white/82 transition duration-300 hover:translate-x-[2px] hover:text-white/95"
                >
                  How It Works
                </button>

                <button
                  type="button"
                  onClick={() => scrollToSection("faqs-section")}
                  className="block text-left text-[16px] text-white/82 transition duration-300 hover:translate-x-[2px] hover:text-white/95"
                >
                  FAQs
                </button>

                <button
                  type="button"
                  onClick={() => scrollToSection("contact-section")}
                  className="block text-left text-[16px] text-white/82 transition duration-300 hover:translate-x-[2px] hover:text-white/95"
                >
                  Contact
                </button>
              </div>
            </div>

            {/* SERVICES */}
            <div>
              <div className="text-[13px] font-semibold uppercase tracking-[0.18em] text-white/70">
                Services
              </div>

              <div className="mt-5 space-y-4">
                <button
                  type="button"
                  onClick={() => scrollToSection("packages-section")}
                  className="block text-left text-[16px] text-white/82 transition duration-300 hover:translate-x-[2px] hover:text-white/95"
                >
                  Basic Grooming
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection("packages-section")}
                  className="block text-left text-[16px] text-white/82 transition duration-300 hover:translate-x-[2px] hover:text-white/95"
                >
                  Hygiene Grooming
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection("packages-section")}
                  className="block text-left text-[16px] text-white/82 transition duration-300 hover:translate-x-[2px] hover:text-white/95"
                >
                  Luxury Grooming
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection("add-ons-section")}
                  className="block text-left text-[16px] text-white/82 transition duration-300 hover:translate-x-[2px] hover:text-white/95"
                >
                  Add-ons
                </button>
              </div>
            </div>

            {/* CONTACT */}
            <div>
              <div className="text-[13px] font-semibold uppercase tracking-[0.18em] text-white/70">
                Reach Us
              </div>

              <div className="mt-5 space-y-4 text-[16px] text-white/82">
                <a href={SUPPORT_PHONE_HREF} className="block transition duration-300 hover:text-white">
                  {SUPPORT_PHONE_DISPLAY}
                </a>
                <a href={SUPPORT_EMAIL_HREF} className="block transition duration-300 hover:text-white">
                  {SUPPORT_EMAIL}
                </a>
                <div>Delhi NCR</div>
                <div>Open 9 AM – 8 PM</div>
              </div>
            </div>

            {/* SOCIAL */}
            <div>
              <div className="text-[13px] font-semibold uppercase tracking-[0.18em] text-white/70">
                Connect
              </div>

              <div className="mt-5 space-y-4">
                <a
                  href={WHATSAPP_HREF}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-[16px] text-white/82 transition duration-300 hover:translate-x-[2px] hover:text-white/95"
                >
                  WhatsApp
                </a>
                <a
                  href={SUPPORT_PHONE_HREF}
                  className="block text-[16px] text-white/82 transition duration-300 hover:translate-x-[2px] hover:text-white/95"
                >
                  Call
                </a>
                <a
                  href={SUPPORT_EMAIL_HREF}
                  className="block text-[16px] text-white/82 transition duration-300 hover:translate-x-[2px] hover:text-white/95"
                >
                  Email
                </a>
                <button
                  type="button"
                  onClick={openTrackBookingModal}
                  className="block text-left text-[16px] text-white/82 transition duration-300 hover:translate-x-[2px] hover:text-white/95"
                >
                  My Bookings
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* BOTTOM STRIP — SHARED */}
    <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-white/8 py-6 text-center lg:mt-10 lg:gap-4 lg:py-8 md:flex-row md:text-left">
      <div className="text-[13px] text-white/55 lg:text-[14px]">
        © 2026 All Tails. All rights reserved.
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 text-[13px] text-white/55 lg:gap-5 lg:text-[14px] md:justify-end">
        <a href="/privacy-policy" className="transition duration-300 hover:text-white/85">
          Privacy Policy
        </a>
        <a href="/terms-and-conditions" className="transition duration-300 hover:text-white/85">
          Terms & Conditions
        </a>
        <a href="/cancellation-policy" className="transition duration-300 hover:text-white/85">
          Cancellation Policy
        </a>
        <a href="/refund-policy" className="transition duration-300 hover:text-white/85">
          Refund Policy
        </a>
      </div>
    </div>
  </div>
</footer>

{/* ── MOBILE BOTTOM NAV ── */}
{!isSlotsModalOpen && !isTrackBookingOpen && !rescheduleBookingId ? (
<nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
  <div className="border-t border-black/[0.06] bg-white/90 backdrop-blur-xl" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
    <div className="mx-auto flex max-w-sm items-center justify-around px-2 py-2">

      {/* Home */}
      <button
        type="button"
        onClick={() => scrollToSection("home-section")}
        className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl py-2 transition-colors ${activeNavSection === "home-section" ? "text-[#6d5bd0]" : "text-[#9b95b8]"}`}
      >
        <Home className={`h-5 w-5 transition-transform ${activeNavSection === "home-section" ? "scale-110" : ""}`} />
        <span className="text-[10px] font-semibold tracking-wide">Home</span>
      </button>

      {/* Plans */}
      <button
        type="button"
        onClick={() => scrollToSection("packages-section")}
        className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl py-2 transition-colors ${activeNavSection === "packages-section" ? "text-[#6d5bd0]" : "text-[#9b95b8]"}`}
      >
        <Layers className={`h-5 w-5 transition-transform ${activeNavSection === "packages-section" ? "scale-110" : ""}`} />
        <span className="text-[10px] font-semibold tracking-wide">Plans</span>
      </button>

      {/* Track */}
      <button
        type="button"
        onClick={openTrackBookingModal}
        className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[#9b95b8] transition-colors"
      >
        <Package className="h-5 w-5" />
        <span className="text-[10px] font-semibold tracking-wide">My bookings</span>
      </button>

      {/* Book — dominant CTA */}
      <div className="flex min-w-0 flex-1 items-center justify-center">
        <button
          type="button"
          onClick={openBookingFlow}
          className="flex items-center gap-1.5 rounded-full bg-[#6d5bd0] px-4 py-2.5 shadow-[0_8px_20px_rgba(109,91,208,0.30)] transition active:scale-95"
        >
          <CalendarCheck className="h-4 w-4 text-white" />
          <span className="text-[12px] font-bold text-white">Book</span>
        </button>
      </div>

    </div>
  </div>
</nav>
) : null}

</main>
);
  }
