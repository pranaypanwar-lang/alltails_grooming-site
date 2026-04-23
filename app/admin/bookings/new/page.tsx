"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Plus, Search, Sparkles, Trash2, Upload, X } from "lucide-react";
import { getBreedSuggestions, normalizeBreedName } from "../../../../lib/pets/breeds";
import {
  formatBookingWindowLabel,
  localIstDateTimeToUtc,
} from "../../../../lib/booking/window";
import {
  createAdminManualBooking,
  fetchAdminBookingCreateMeta,
  fetchAdminSavedPetsByPhone,
} from "../../lib/api";
import type {
  AdminBookingCreateMetaResponse,
  AdminManualBookingPayload,
  AdminManualBookingResponse,
  AdminManualBookingSource,
  AdminSavedPet,
} from "../../types";
import { AdminPageHeader } from "../../components/common/AdminPageHeader";
import { useAdminToast } from "../../components/common/AdminToastProvider";

type BookingWindowOption = {
  bookingWindowId: string;
  teamId: string;
  teamName: string;
  petCount: number;
  startTime: string;
  endTime: string;
  slotLabels: string[];
  slotIds: string[];
  displayLabel: string;
};

type UploadedBookingAsset = {
  id: string;
  storageKey: string;
  publicUrl: string;
  originalName: string;
};

type ManualPetDraft = {
  id: string;
  sourcePetId?: string;
  name: string;
  breed: string;
  groomingNotes: string;
  stylingNotes: string;
  concernAssets: UploadedBookingAsset[];
  stylingAssets: UploadedBookingAsset[];
  uploadingConcern: boolean;
  uploadingStyling: boolean;
};

const SOURCE_OPTIONS: Array<{ value: AdminManualBookingSource; label: string }> = [
  { value: "call", label: "Call" },
  { value: "instagram_dm", label: "Instagram DM" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "manual_internal", label: "Manual internal" },
];

function makePetDraft(seed?: Partial<ManualPetDraft>): ManualPetDraft {
  return {
    id: Math.random().toString(36).slice(2, 10),
    sourcePetId: seed?.sourcePetId,
    name: seed?.name ?? "",
    breed: seed?.breed ?? "",
    groomingNotes: seed?.groomingNotes ?? "",
    stylingNotes: seed?.stylingNotes ?? "",
    concernAssets: [],
    stylingAssets: [],
    uploadingConcern: false,
    uploadingStyling: false,
  };
}

export default function AdminNewBookingPage() {
  const { showToast } = useAdminToast();
  const [meta, setMeta] = useState<AdminBookingCreateMetaResponse | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [metaError, setMetaError] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [serviceAreaSlug, setServiceAreaSlug] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"pay_now" | "pay_after_service">(
    "pay_now"
  );
  const [serviceAddress, setServiceAddress] = useState("");
  const [serviceLandmark, setServiceLandmark] = useState("");
  const [servicePincode, setServicePincode] = useState("");
  const [serviceLocationUrl, setServiceLocationUrl] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [customStartTime, setCustomStartTime] = useState("");
  const [customEndTime, setCustomEndTime] = useState("");
  const [source, setSource] = useState<AdminManualBookingSource>("call");
  const [adminNote, setAdminNote] = useState("");
  const [pets, setPets] = useState<ManualPetDraft[]>([makePetDraft()]);
  const [activeBreedPetId, setActiveBreedPetId] = useState<string | null>(null);

  const [savedPets, setSavedPets] = useState<AdminSavedPet[]>([]);
  const [savedPetsLoading, setSavedPetsLoading] = useState(false);
  const [savedPetsError, setSavedPetsError] = useState("");
  const [savedPetsLookupPhone, setSavedPetsLookupPhone] = useState("");

  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [bookingWindows, setBookingWindows] = useState<BookingWindowOption[]>([]);
  const [selectedBookingWindowId, setSelectedBookingWindowId] = useState("");

  const [submitLoading, setSubmitLoading] = useState(false);
  const [success, setSuccess] = useState<AdminManualBookingResponse | null>(null);

  useEffect(() => {
    const loadMeta = async () => {
      setMetaLoading(true);
      setMetaError("");
      try {
        const data = await fetchAdminBookingCreateMeta();
        setMeta(data);
      } catch (error) {
        setMetaError(error instanceof Error ? error.message : "Failed to load booking options");
      } finally {
        setMetaLoading(false);
      }
    };

    void loadMeta();
  }, []);

  const selectedWindow = useMemo(
    () => bookingWindows.find((window) => window.bookingWindowId === selectedBookingWindowId) ?? null,
    [bookingWindows, selectedBookingWindowId]
  );

  const selectedWindowDurationMs = useMemo(() => {
    if (!selectedWindow) return 0;
    return new Date(selectedWindow.endTime).getTime() - new Date(selectedWindow.startTime).getTime();
  }, [selectedWindow]);

  const effectiveWindowLabel = useMemo(() => {
    if (!selectedWindow) return "Not selected";
    if (!customStartTime || !selectedDate) return selectedWindow.displayLabel;

    const customStartAt = localIstDateTimeToUtc(selectedDate, customStartTime);
    const customEndAt = customEndTime
      ? localIstDateTimeToUtc(selectedDate, customEndTime)
      : new Date(customStartAt.getTime() + selectedWindowDurationMs);
    return formatBookingWindowLabel(customStartAt, customEndAt);
  }, [customEndTime, customStartTime, selectedDate, selectedWindow, selectedWindowDurationMs]);

  const canLookupSavedPets = phone.replace(/\D/g, "").length >= 10;
  const canLoadAvailability =
    !!serviceAreaSlug &&
    !!selectedDate &&
    pets.length > 0 &&
    pets.every((pet) => pet.breed.trim());
  const canSubmit =
    !!name.trim() &&
    !!phone.trim() &&
    !!city &&
    !!serviceName &&
    !!selectedDate &&
    !!selectedWindow &&
    pets.length > 0 &&
    pets.every((pet) => pet.breed.trim()) &&
    !submitLoading;

  const resetBookingState = () => {
    setName("");
    setPhone("");
    setCity("");
    setServiceAreaSlug("");
    setServiceName("");
    setSelectedDate("");
    setPaymentMethod("pay_now");
    setServiceAddress("");
    setServiceLandmark("");
    setServicePincode("");
    setServiceLocationUrl("");
    setCouponCode("");
    setCustomAmount("");
    setCustomStartTime("");
    setCustomEndTime("");
    setSource("call");
    setAdminNote("");
    setPets([makePetDraft()]);
    setSavedPets([]);
    setSavedPetsError("");
    setSavedPetsLookupPhone("");
    setAvailabilityError("");
    setBookingWindows([]);
    setSelectedBookingWindowId("");
    setSuccess(null);
  };

  const updatePet = (id: string, patch: Partial<ManualPetDraft>) => {
    setPets((current) =>
      current.map((pet) => (pet.id === id ? { ...pet, ...patch } : pet))
    );
    setSelectedBookingWindowId("");
  };

  const uploadPetAssets = async (
    petId: string,
    kind: "styling_reference" | "concern_photo",
    files: FileList | null
  ) => {
    if (!files?.length) return;

    updatePet(
      petId,
      kind === "styling_reference" ? { uploadingStyling: true } : { uploadingConcern: true }
    );

    try {
      const petIndex = pets.findIndex((pet) => pet.id === petId);
      const uploadedAssets = await Promise.all(
        Array.from(files).map(async (file) => {
          const formData = new FormData();
          formData.set("file", file);
          formData.set("kind", kind);
          formData.set("petIndex", String(Math.max(0, petIndex)));

          const response = await fetch("/api/uploads/booking-asset", {
            method: "POST",
            body: formData,
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(data?.error ?? "Failed to upload images");
          }

          return data.asset as UploadedBookingAsset;
        })
      );

      setPets((current) =>
        current.map((pet) => {
          if (pet.id !== petId) return pet;
          return kind === "styling_reference"
            ? {
                ...pet,
                stylingAssets: [...pet.stylingAssets, ...uploadedAssets],
                uploadingStyling: false,
              }
            : {
                ...pet,
                concernAssets: [...pet.concernAssets, ...uploadedAssets],
                uploadingConcern: false,
              };
        })
      );
      showToast("Images uploaded.", true);
    } catch (error) {
      updatePet(
        petId,
        kind === "styling_reference" ? { uploadingStyling: false } : { uploadingConcern: false }
      );
      showToast(error instanceof Error ? error.message : "Failed to upload images.", false);
    }
  };

  const removePetAsset = (
    petId: string,
    kind: "styling_reference" | "concern_photo",
    assetId: string
  ) => {
    setPets((current) =>
      current.map((pet) => {
        if (pet.id !== petId) return pet;
        return kind === "styling_reference"
          ? {
              ...pet,
              stylingAssets: pet.stylingAssets.filter((asset) => asset.id !== assetId),
            }
          : {
              ...pet,
              concernAssets: pet.concernAssets.filter((asset) => asset.id !== assetId),
            };
      })
    );
  };

  const handlePetBreedInputChange = (id: string, value: string) => {
    setActiveBreedPetId(id);
    updatePet(id, { breed: value });
  };

  const handleSelectBreedSuggestion = (id: string, breed: string) => {
    updatePet(id, { breed: normalizeBreedName(breed) });
    setActiveBreedPetId(null);
  };

  const handlePetBreedBlur = (id: string) => {
    window.setTimeout(() => {
      setPets((current) =>
        current.map((pet) =>
          pet.id === id ? { ...pet, breed: normalizeBreedName(pet.breed) } : pet
        )
      );
      setActiveBreedPetId((current) => (current === id ? null : current));
    }, 120);
  };

  const removePet = (id: string) => {
    setPets((current) => {
      const next = current.filter((pet) => pet.id !== id);
      return next.length ? next : [makePetDraft()];
    });
    setSelectedBookingWindowId("");
  };

  const addBlankPet = () => {
    setPets((current) => [...current, makePetDraft()]);
    setSelectedBookingWindowId("");
  };

  const isSavedPetSelected = (petId: string) =>
    pets.some((pet) => pet.sourcePetId === petId);

  const toggleSavedPet = (savedPet: AdminSavedPet) => {
    setPets((current) => {
      const existingIndex = current.findIndex((pet) => pet.sourcePetId === savedPet.petId);
      if (existingIndex >= 0) {
        const next = current.filter((pet) => pet.sourcePetId !== savedPet.petId);
        return next.length ? next : [makePetDraft()];
      }

      return [
        ...current,
        makePetDraft({
          sourcePetId: savedPet.petId,
          name: savedPet.name ?? "",
          breed: savedPet.breed,
          groomingNotes: savedPet.defaultGroomingNotes ?? "",
          stylingNotes: savedPet.defaultStylingNotes ?? "",
        }),
      ];
    });
    setSelectedBookingWindowId("");
  };

  const lookupSavedPets = async () => {
    if (!canLookupSavedPets) {
      setSavedPets([]);
      setSavedPetsError("Enter a valid 10-digit phone number first.");
      return;
    }

    setSavedPetsLoading(true);
    setSavedPetsError("");
    try {
      const data = await fetchAdminSavedPetsByPhone(phone);
      setSavedPets(data.pets);
      setSavedPetsLookupPhone(phone);
      if (!data.found || data.pets.length === 0) {
        setSavedPetsError("No saved companions found for this phone number.");
      }
    } catch (error) {
      setSavedPetsError(error instanceof Error ? error.message : "Failed to load saved pets.");
    } finally {
      setSavedPetsLoading(false);
    }
  };

  const loadAvailability = async () => {
    if (!canLoadAvailability) {
      setAvailabilityError("Select a city, date, and valid pet details first.");
      return;
    }

    setAvailabilityLoading(true);
    setAvailabilityError("");
    setSelectedBookingWindowId("");
    try {
      const res = await fetch("/api/booking/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: serviceAreaSlug,
          startDate: selectedDate,
          days: 1,
          petCount: pets.length,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to load availability");
      }

      const windows = (data?.dates?.[0]?.bookingWindows ?? []) as BookingWindowOption[];
      setBookingWindows(windows);
      if (windows.length === 0) {
        setAvailabilityError("No booking windows are available for this date and service area.");
      }
    } catch (error) {
      setAvailabilityError(error instanceof Error ? error.message : "Failed to load availability");
      setBookingWindows([]);
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const submit = async () => {
    if (!selectedWindow) return;

    const payload: AdminManualBookingPayload = {
      name: name.trim(),
      phone: phone.trim(),
      city,
      serviceName,
      selectedDate,
      bookingWindowId: selectedWindow.bookingWindowId,
      slotIds: selectedWindow.slotIds,
      customStartTime: customStartTime.trim() || undefined,
      customEndTime: customEndTime.trim() || undefined,
      customAmount: customAmount.trim() ? Number(customAmount) : undefined,
      serviceAddress: serviceAddress.trim(),
      serviceLandmark: serviceLandmark.trim(),
      servicePincode: servicePincode.trim(),
      serviceLocationUrl: serviceLocationUrl.trim(),
      paymentMethod,
      couponCode: paymentMethod === "pay_now" ? couponCode.trim().toUpperCase() : "",
      source,
      adminNote: adminNote.trim(),
      pets: pets.map((pet) => ({
        sourcePetId: pet.sourcePetId,
        isSavedProfile: !!pet.sourcePetId,
        name: pet.name.trim(),
        breed: pet.breed.trim(),
        groomingNotes: pet.groomingNotes.trim(),
        stylingNotes: pet.stylingNotes.trim(),
        stylingAssets: pet.stylingAssets,
        concernAssets: pet.concernAssets,
      })),
    };

    setSubmitLoading(true);
    try {
      const data = await createAdminManualBooking(payload);
      setSuccess(data);
      showToast("Manual booking created.", true);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to create booking.", false);
    } finally {
      setSubmitLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#f7f7fb]">
        <div className="mx-auto max-w-[1080px] px-4 py-6 md:px-6 lg:px-8">
          <AdminPageHeader
            title="Booking created"
            subtitle="The booking has been created inside the admin console."
            rightSlot={
              <Link
                href="/admin/bookings"
                className="inline-flex h-[42px] items-center gap-2 rounded-[14px] border border-[#ddd1fb] bg-white px-4 text-[13px] font-semibold text-[#6d5bd0] transition-colors hover:bg-[#f6f4fd]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to bookings
              </Link>
            }
          />

          <div className="rounded-[28px] border border-[#ece5ff] bg-white p-6 shadow-[0_18px_48px_rgba(73,44,120,0.08)]">
            <div className="inline-flex rounded-full bg-[#f4efff] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#6d5bd0]">
              Success
            </div>
            <h2 className="mt-4 text-[28px] font-black tracking-[-0.03em] text-[#1f1f2c]">
              Booking {success.bookingId.slice(0, 8)} is ready
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-[20px] border border-[#ece5ff] bg-[#fcfbff] p-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Status</div>
                <div className="mt-2 text-[14px] text-[#2a2346]">
                  Payment: <span className="font-semibold">{success.paymentStatus}</span>
                </div>
                <div className="mt-1 text-[14px] text-[#2a2346]">
                  Booking: <span className="font-semibold">{success.status}</span>
                </div>
                <div className="mt-1 text-[14px] text-[#2a2346]">
                  Final amount: <span className="font-semibold">₹{success.finalAmount.toLocaleString("en-IN")}</span>
                </div>
              </div>
              <div className="rounded-[20px] border border-[#ece5ff] bg-[#fcfbff] p-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Window</div>
                <div className="mt-2 text-[14px] text-[#2a2346]">{success.selectedDate}</div>
                <div className="mt-1 text-[14px] text-[#2a2346]">{success.bookingWindowLabel}</div>
                {success.paymentOrder ? (
                  <div className="mt-3 rounded-[14px] bg-[#fff8eb] px-3 py-2 text-[12px] text-[#9a6700]">
                    Razorpay order created: <span className="font-mono">{success.paymentOrder.orderId}</span>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={resetBookingState}
                className="inline-flex h-[44px] items-center gap-2 rounded-[14px] bg-[#6d5bd0] px-5 text-[13px] font-semibold text-white transition-colors hover:bg-[#5b4ab5]"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Create another booking
              </button>
              <Link
                href="/admin/bookings"
                className="inline-flex h-[44px] items-center rounded-[14px] border border-[#ddd1fb] bg-white px-5 text-[13px] font-semibold text-[#6d5bd0] transition-colors hover:bg-[#f6f4fd]"
              >
                Return to bookings list
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7fb]">
      <div className="mx-auto max-w-[1080px] px-4 py-6 md:px-6 lg:px-8">
        <AdminPageHeader
          title="Create booking"
          subtitle="Capture phone-call, DM, WhatsApp, and internal bookings without leaving the ops console."
          rightSlot={
            <Link
              href="/admin/bookings"
              className="inline-flex h-[42px] items-center gap-2 rounded-[14px] border border-[#ddd1fb] bg-white px-4 text-[13px] font-semibold text-[#6d5bd0] transition-colors hover:bg-[#f6f4fd]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to bookings
            </Link>
          }
        />

        {metaError ? (
          <div className="mb-4 rounded-[18px] border border-[#f7d7d7] bg-[#fff8f8] px-4 py-3 text-[13px] text-[#b42318]">
            {metaError}
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <section className="rounded-[28px] border border-[#ece5ff] bg-white p-5 shadow-[0_18px_48px_rgba(73,44,120,0.06)]">
              <div className="text-[18px] font-black tracking-[-0.02em] text-[#1f1f2c]">Customer</div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Customer name</div>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="h-[46px] w-full rounded-[14px] border border-[#ddd1fb] px-4 text-[14px] text-[#2a2346] outline-none transition-colors focus:border-[#6d5bd0]"
                    placeholder="Pet parent name"
                  />
                </label>
                <label className="block">
                  <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Phone</div>
                  <div className="flex gap-2">
                    <input
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      className="h-[46px] min-w-0 flex-1 rounded-[14px] border border-[#ddd1fb] px-4 text-[14px] text-[#2a2346] outline-none transition-colors focus:border-[#6d5bd0]"
                      placeholder="9876543210"
                    />
                    <button
                      type="button"
                      onClick={() => void lookupSavedPets()}
                      disabled={!canLookupSavedPets || savedPetsLoading}
                      className="inline-flex h-[46px] items-center gap-2 rounded-[14px] border border-[#ddd1fb] bg-white px-4 text-[13px] font-semibold text-[#6d5bd0] transition-colors hover:bg-[#f6f4fd] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savedPetsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                      Saved pets
                    </button>
                  </div>
                </label>
                <label className="block">
                  <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">City</div>
                  <select
                    value={serviceAreaSlug}
                    onChange={(event) => {
                      const area = meta?.serviceAreas.find((item) => item.slug === event.target.value) ?? null;
                      setCity(area?.name ?? "");
                      setServiceAreaSlug(area?.slug ?? "");
                      setBookingWindows([]);
                      setAvailabilityError("");
                      setSelectedBookingWindowId("");
                    }}
                    className="h-[46px] w-full rounded-[14px] border border-[#ddd1fb] bg-white px-4 text-[14px] text-[#2a2346] outline-none transition-colors focus:border-[#6d5bd0]"
                    disabled={metaLoading}
                  >
                    <option value="">Select city</option>
                    {meta?.serviceAreas.map((area) => (
                      <option key={area.id} value={area.slug}>
                        {area.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Service</div>
                  <select
                    value={serviceName}
                    onChange={(event) => setServiceName(event.target.value)}
                    className="h-[46px] w-full rounded-[14px] border border-[#ddd1fb] bg-white px-4 text-[14px] text-[#2a2346] outline-none transition-colors focus:border-[#6d5bd0]"
                    disabled={metaLoading}
                  >
                    <option value="">Select service</option>
                    {meta?.services.map((service) => (
                      <option key={service.id} value={service.name}>
                        {service.name} · ₹{service.price.toLocaleString("en-IN")}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-5 rounded-[22px] border border-[#ece5ff] bg-[#fcfbff] p-4">
                <div className="text-[14px] font-bold text-[#2a2346]">Service address</div>
                <div className="mt-3 grid gap-4">
                  <label className="block">
                    <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Address</div>
                    <textarea
                      value={serviceAddress}
                      onChange={(event) => setServiceAddress(event.target.value)}
                      rows={3}
                      className="w-full rounded-[14px] border border-[#ddd1fb] px-4 py-3 text-[14px] text-[#2a2346] outline-none transition-colors focus:border-[#6d5bd0]"
                      placeholder="House / flat, street, area"
                    />
                  </label>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Landmark</div>
                      <input
                        value={serviceLandmark}
                        onChange={(event) => setServiceLandmark(event.target.value)}
                        className="h-[46px] w-full rounded-[14px] border border-[#ddd1fb] px-4 text-[14px] text-[#2a2346] outline-none transition-colors focus:border-[#6d5bd0]"
                        placeholder="Nearby landmark"
                      />
                    </label>
                    <label className="block">
                      <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Pin code</div>
                      <input
                        value={servicePincode}
                        onChange={(event) => setServicePincode(event.target.value)}
                        className="h-[46px] w-full rounded-[14px] border border-[#ddd1fb] px-4 text-[14px] text-[#2a2346] outline-none transition-colors focus:border-[#6d5bd0]"
                        placeholder="201014"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Google Maps link</div>
                    <input
                      value={serviceLocationUrl}
                      onChange={(event) => setServiceLocationUrl(event.target.value)}
                      className="h-[46px] w-full rounded-[14px] border border-[#ddd1fb] px-4 text-[14px] text-[#2a2346] outline-none transition-colors focus:border-[#6d5bd0]"
                      placeholder="https://maps.google.com/..."
                    />
                  </label>
                </div>
              </div>

              {savedPetsError ? (
                <div className="mt-3 rounded-[14px] border border-[#f3e4bf] bg-[#fffaf0] px-4 py-3 text-[12px] text-[#9a6700]">
                  {savedPetsError}
                </div>
              ) : null}

              {savedPets.length > 0 ? (
                <div className="mt-4">
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">
                    Saved companions {savedPetsLookupPhone ? `for ${savedPetsLookupPhone}` : ""}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {savedPets.map((pet) => {
                      const selected = isSavedPetSelected(pet.petId);
                      return (
                        <button
                          key={pet.petId}
                          type="button"
                          onClick={() => toggleSavedPet(pet)}
                          className={`rounded-[14px] border px-3 py-2 text-left transition-colors ${
                            selected
                              ? "border-[#6d5bd0] bg-[#f6f3ff] text-[#4c3ca1]"
                              : "border-[#ece5ff] bg-white text-[#2a2346] hover:bg-[#f9f7ff]"
                          }`}
                        >
                          <div className="text-[13px] font-semibold">{pet.name || "Unnamed pet"}</div>
                          <div className="text-[12px] text-[#7c8499]">{pet.breed}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </section>

            <section className="rounded-[28px] border border-[#ece5ff] bg-white p-5 shadow-[0_18px_48px_rgba(73,44,120,0.06)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[18px] font-black tracking-[-0.02em] text-[#1f1f2c]">Pets</div>
                  <div className="mt-1 text-[13px] text-[#7c8499]">Saved profiles and manual pet details both work here.</div>
                </div>
                <button
                  type="button"
                  onClick={addBlankPet}
                  className="inline-flex h-[40px] items-center gap-2 rounded-[14px] border border-[#ddd1fb] bg-white px-4 text-[13px] font-semibold text-[#6d5bd0] transition-colors hover:bg-[#f6f4fd]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add pet
                </button>
              </div>

              <div className="mt-4 space-y-4">
                {pets.map((pet, index) => (
                  <div key={pet.id} className="rounded-[22px] border border-[#ece5ff] bg-[#fcfbff] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="text-[14px] font-bold text-[#2a2346]">
                        Pet {index + 1}
                        {pet.sourcePetId ? (
                          <span className="ml-2 rounded-full bg-[#f4efff] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#6d5bd0]">
                            saved profile
                          </span>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => removePet(pet.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#f0e2e2] text-[#c24134] transition-colors hover:bg-[#fff4f4]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block">
                        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Name</div>
                        <input
                          value={pet.name}
                          onChange={(event) => updatePet(pet.id, { name: event.target.value })}
                          className="h-[44px] w-full rounded-[14px] border border-[#ddd1fb] px-4 text-[14px] text-[#2a2346] outline-none transition-colors focus:border-[#6d5bd0]"
                          placeholder="Pet name"
                        />
                      </label>
                      <label className="block">
                        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Breed</div>
                        <div className="relative">
                          <input
                            value={pet.breed}
                            onChange={(event) => handlePetBreedInputChange(pet.id, event.target.value)}
                            onFocus={() => setActiveBreedPetId(pet.id)}
                            onBlur={() => handlePetBreedBlur(pet.id)}
                            className="h-[44px] w-full rounded-[14px] border border-[#ddd1fb] px-4 text-[14px] text-[#2a2346] outline-none transition-colors focus:border-[#6d5bd0]"
                            placeholder="Breed"
                          />
                          {activeBreedPetId === pet.id && getBreedSuggestions(pet.breed).length > 0 ? (
                            <div className="absolute left-0 right-0 top-[52px] z-20 overflow-hidden rounded-[18px] border border-[#ece5ff] bg-white shadow-[0_16px_36px_rgba(73,44,120,0.12)]">
                              {getBreedSuggestions(pet.breed).map((breed) => (
                                <button
                                  key={breed}
                                  type="button"
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => handleSelectBreedSuggestion(pet.id, breed)}
                                  className="flex w-full items-center justify-between px-5 py-3 text-left text-[14px] text-[#2a2346] hover:bg-[#faf8ff]"
                                >
                                  <span>{breed}</span>
                                  <span className="text-[12px] text-[#8a90a6]">Select</span>
                                </button>
                              ))}
                              <div className="border-t border-[#f2edff] bg-[#fcfbff] px-5 py-2.5 text-[11px] text-[#6b7280]">
                                Can&apos;t find the breed? Continue typing.
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </label>
                      <label className="block">
                        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Grooming notes</div>
                        <textarea
                          value={pet.groomingNotes}
                          onChange={(event) => updatePet(pet.id, { groomingNotes: event.target.value })}
                          rows={3}
                          className="w-full rounded-[14px] border border-[#ddd1fb] px-4 py-3 text-[14px] text-[#2a2346] outline-none transition-colors focus:border-[#6d5bd0]"
                          placeholder="Skin sensitivity, handling note, etc."
                        />
                      </label>
                      <label className="block">
                        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Styling notes</div>
                        <textarea
                          value={pet.stylingNotes}
                          onChange={(event) => updatePet(pet.id, { stylingNotes: event.target.value })}
                          rows={3}
                          className="w-full rounded-[14px] border border-[#ddd1fb] px-4 py-3 text-[14px] text-[#2a2346] outline-none transition-colors focus:border-[#6d5bd0]"
                          placeholder="Trim style, coat finish, haircut preference."
                        />
                      </label>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <div className="rounded-[18px] border border-[#ece5ff] bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">
                              Pet current photos
                            </div>
                            <div className="mt-1 text-[12px] text-[#7c8499]">
                              These help the groomer assess current coat condition before the visit.
                            </div>
                          </div>
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-[12px] border border-[#ddd1fb] bg-[#faf9fd] px-3 py-2 text-[12px] font-semibold text-[#6d5bd0]">
                            {pet.uploadingConcern ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Upload className="h-3.5 w-3.5" />
                            )}
                            Upload
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(event) => {
                                void uploadPetAssets(pet.id, "concern_photo", event.target.files);
                                event.target.value = "";
                              }}
                            />
                          </label>
                        </div>

                        {pet.concernAssets.length > 0 ? (
                          <div className="mt-3 grid grid-cols-2 gap-3">
                            {pet.concernAssets.map((asset) => (
                              <div key={asset.id} className="relative overflow-hidden rounded-[14px] border border-[#ece5ff] bg-[#fcfbff]">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={asset.publicUrl} alt={asset.originalName} className="h-28 w-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => removePetAsset(pet.id, "concern_photo", asset.id)}
                                  className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                                <div className="truncate px-3 py-2 text-[11px] text-[#6b7280]">{asset.originalName}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-3 rounded-[14px] border border-dashed border-[#ddd1fb] px-4 py-5 text-[12px] text-[#8a90a6]">
                            No current pet photos uploaded yet.
                          </div>
                        )}
                      </div>

                      <div className="rounded-[18px] border border-[#ece5ff] bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">
                              Style reference photos
                            </div>
                            <div className="mt-1 text-[12px] text-[#7c8499]">
                              These are the exact styling references that the groomer will see in the job flow.
                            </div>
                          </div>
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-[12px] border border-[#ddd1fb] bg-[#faf9fd] px-3 py-2 text-[12px] font-semibold text-[#6d5bd0]">
                            {pet.uploadingStyling ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Upload className="h-3.5 w-3.5" />
                            )}
                            Upload
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(event) => {
                                void uploadPetAssets(pet.id, "styling_reference", event.target.files);
                                event.target.value = "";
                              }}
                            />
                          </label>
                        </div>

                        {pet.stylingAssets.length > 0 ? (
                          <div className="mt-3 grid grid-cols-2 gap-3">
                            {pet.stylingAssets.map((asset) => (
                              <div key={asset.id} className="relative overflow-hidden rounded-[14px] border border-[#ece5ff] bg-[#fcfbff]">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={asset.publicUrl} alt={asset.originalName} className="h-28 w-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => removePetAsset(pet.id, "styling_reference", asset.id)}
                                  className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                                <div className="truncate px-3 py-2 text-[11px] text-[#6b7280]">{asset.originalName}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-3 rounded-[14px] border border-dashed border-[#ddd1fb] px-4 py-5 text-[12px] text-[#8a90a6]">
                            No styling reference photos uploaded yet.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-[#ece5ff] bg-white p-5 shadow-[0_18px_48px_rgba(73,44,120,0.06)]">
              <div className="text-[18px] font-black tracking-[-0.02em] text-[#1f1f2c]">Date & slot</div>
              <div className="mt-4 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                <label className="block">
                  <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Date</div>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(event) => {
                      setSelectedDate(event.target.value);
                      setBookingWindows([]);
                      setAvailabilityError("");
                      setSelectedBookingWindowId("");
                    }}
                    className="h-[46px] w-full rounded-[14px] border border-[#ddd1fb] px-4 text-[14px] text-[#2a2346] outline-none transition-colors focus:border-[#6d5bd0]"
                  />
                </label>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => void loadAvailability()}
                    disabled={!canLoadAvailability || availabilityLoading}
                    className="inline-flex h-[46px] items-center gap-2 rounded-[14px] bg-[#6d5bd0] px-5 text-[13px] font-semibold text-white transition-colors hover:bg-[#5b4ab5] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {availabilityLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                    Load available windows
                  </button>
                </div>
              </div>

              <div className="mt-4 rounded-[22px] border border-[#ece5ff] bg-[#fcfbff] p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <div className="text-[14px] font-bold text-[#2a2346]">Custom start time</div>
                    <div className="mt-1 text-[12px] text-[#7c8499]">
                      For manual exceptions, you can define the exact promised window. We&apos;ll block any overlapping online slots automatically.
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 md:w-[460px]">
                    <label className="block">
                      <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Manual start time</div>
                      <input
                        type="time"
                        value={customStartTime}
                        onChange={(event) => setCustomStartTime(event.target.value)}
                        disabled={!selectedWindow || !selectedDate}
                        className="h-[46px] w-full rounded-[14px] border border-[#ddd1fb] px-4 text-[14px] text-[#2a2346] outline-none transition-colors focus:border-[#6d5bd0] disabled:cursor-not-allowed disabled:bg-[#f7f7fb]"
                      />
                    </label>
                    <label className="block">
                      <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Manual end time</div>
                      <input
                        type="time"
                        value={customEndTime}
                        onChange={(event) => setCustomEndTime(event.target.value)}
                        disabled={!selectedWindow || !selectedDate}
                        className="h-[46px] w-full rounded-[14px] border border-[#ddd1fb] px-4 text-[14px] text-[#2a2346] outline-none transition-colors focus:border-[#6d5bd0] disabled:cursor-not-allowed disabled:bg-[#f7f7fb]"
                      />
                    </label>
                  </div>
                </div>

                <div className="mt-3 rounded-[16px] border border-dashed border-[#d7cdf8] bg-white px-4 py-3">
                  <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Promised window</div>
                  <div className="mt-1 text-[15px] font-semibold text-[#2a2346]">{effectiveWindowLabel}</div>
                  {customStartTime && selectedWindow ? (
                    <div className="mt-1 text-[12px] text-[#7c8499]">
                      {customEndTime
                        ? "The exact overlap between this start/end range and standard slots will be blocked online."
                        : "If no manual end time is set, we’ll use the selected slot capacity to derive the end time."}
                    </div>
                  ) : null}
                </div>
              </div>

              {availabilityError ? (
                <div className="mt-3 rounded-[14px] border border-[#f3e4bf] bg-[#fffaf0] px-4 py-3 text-[12px] text-[#9a6700]">
                  {availabilityError}
                </div>
              ) : null}

              {bookingWindows.length > 0 ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {bookingWindows.map((window) => {
                    const selected = window.bookingWindowId === selectedBookingWindowId;
                    return (
                      <button
                        key={window.bookingWindowId}
                        type="button"
                        onClick={() => setSelectedBookingWindowId(window.bookingWindowId)}
                        className={`rounded-[20px] border p-4 text-left transition-colors ${
                          selected
                            ? "border-[#6d5bd0] bg-[#f6f3ff]"
                            : "border-[#ece5ff] bg-white hover:bg-[#fcfbff]"
                        }`}
                      >
                        <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">{window.teamName}</div>
                        <div className="mt-2 text-[16px] font-bold text-[#2a2346]">{window.displayLabel}</div>
                        <div className="mt-1 text-[13px] text-[#7c8499]">{window.slotLabels.join(" · ")}</div>
                        <div className="mt-3 text-[12px] text-[#6d5bd0]">Covers {window.petCount} pet{window.petCount > 1 ? "s" : ""}</div>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-[28px] border border-[#ece5ff] bg-white p-5 shadow-[0_18px_48px_rgba(73,44,120,0.06)]">
              <div className="text-[18px] font-black tracking-[-0.02em] text-[#1f1f2c]">Ops metadata</div>
              <div className="mt-4 space-y-4">
                <label className="block">
                  <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Source</div>
                  <select
                    value={source}
                    onChange={(event) => setSource(event.target.value as AdminManualBookingSource)}
                    className="h-[46px] w-full rounded-[14px] border border-[#ddd1fb] bg-white px-4 text-[14px] text-[#2a2346] outline-none transition-colors focus:border-[#6d5bd0]"
                  >
                    {SOURCE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Payment method</div>
                  <select
                    value={paymentMethod}
                    onChange={(event) =>
                      setPaymentMethod(event.target.value as "pay_now" | "pay_after_service")
                    }
                    className="h-[46px] w-full rounded-[14px] border border-[#ddd1fb] bg-white px-4 text-[14px] text-[#2a2346] outline-none transition-colors focus:border-[#6d5bd0]"
                  >
                    <option value="pay_now">Pay now</option>
                    <option value="pay_after_service">Pay after service</option>
                  </select>
                </label>

                <label className="block">
                  <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Coupon</div>
                  <input
                    value={couponCode}
                    onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                    disabled={paymentMethod !== "pay_now"}
                    className="h-[46px] w-full rounded-[14px] border border-[#ddd1fb] px-4 text-[14px] text-[#2a2346] outline-none transition-colors focus:border-[#6d5bd0] disabled:cursor-not-allowed disabled:bg-[#f7f7fb]"
                    placeholder="FIRST10, MULTIPET5"
                  />
                  <div className="mt-1 text-[12px] text-[#7c8499]">
                    For prepaid bookings, stackable coupon codes can be clubbed by separating them with commas.
                  </div>
                </label>

                <label className="block">
                  <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Manual final amount</div>
                  <input
                    inputMode="decimal"
                    value={customAmount}
                    onChange={(event) => setCustomAmount(event.target.value)}
                    className="h-[46px] w-full rounded-[14px] border border-[#ddd1fb] px-4 text-[14px] text-[#2a2346] outline-none transition-colors focus:border-[#6d5bd0]"
                    placeholder="Leave blank to use standard service price"
                  />
                  <div className="mt-1 text-[12px] text-[#7c8499]">
                    Use this only for manual exceptions. Online bookings will still follow standardized service pricing.
                  </div>
                </label>

                <label className="block">
                  <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Ops note</div>
                  <textarea
                    value={adminNote}
                    onChange={(event) => setAdminNote(event.target.value)}
                    rows={5}
                    className="w-full rounded-[14px] border border-[#ddd1fb] px-4 py-3 text-[14px] text-[#2a2346] outline-none transition-colors focus:border-[#6d5bd0]"
                    placeholder="DM follow-up needed, late-arrival risk, anxious pet, customer requested callback..."
                  />
                </label>
              </div>
            </section>

            <section className="rounded-[28px] border border-[#ece5ff] bg-white p-5 shadow-[0_18px_48px_rgba(73,44,120,0.06)]">
              <div className="text-[18px] font-black tracking-[-0.02em] text-[#1f1f2c]">Summary</div>
              <div className="mt-4 space-y-2 text-[13px] text-[#6b7280]">
                <div className="flex items-center justify-between gap-3">
                  <span>Pets</span>
                  <span className="font-semibold text-[#2a2346]">{pets.length}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Window</span>
                  <span className="text-right font-semibold text-[#2a2346]">{effectiveWindowLabel}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Team</span>
                  <span className="text-right font-semibold text-[#2a2346]">{selectedWindow?.teamName ?? "TBD"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Amount</span>
                  <span className="text-right font-semibold text-[#2a2346]">
                    ₹
                    {(
                      customAmount.trim()
                        ? Number(customAmount)
                        : meta?.services.find((service) => service.name === serviceName)?.price ?? 0
                    ).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Payment</span>
                  <span className="font-semibold text-[#2a2346]">{paymentMethod === "pay_now" ? "Pay now" : "Pay after service"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Source</span>
                  <span className="font-semibold text-[#2a2346]">
                    {SOURCE_OPTIONS.find((option) => option.value === source)?.label}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void submit()}
                disabled={!canSubmit}
                className="mt-5 inline-flex h-[48px] w-full items-center justify-center gap-2 rounded-[16px] bg-[#6d5bd0] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[#5b4ab5] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Create booking
              </button>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
