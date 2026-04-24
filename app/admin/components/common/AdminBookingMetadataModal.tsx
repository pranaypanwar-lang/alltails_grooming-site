"use client";

import { useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import type { AdminManualBookingSource } from "../../types";

const SOURCE_OPTIONS: Array<{ value: AdminManualBookingSource | "website"; label: string }> = [
  { value: "website", label: "Website" },
  { value: "call", label: "Call" },
  { value: "instagram_dm", label: "Instagram DM" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "manual_internal", label: "Manual internal" },
];

type UploadedBookingAsset = {
  id: string;
  storageKey: string;
  publicUrl: string;
  originalName: string;
};

type SubmittedBookingAsset = {
  storageKey: string;
  publicUrl: string;
  originalName: string;
};

type EditableBookingPet = {
  bookingPetId: string;
  name: string | null;
  breed: string;
  concernAssets: UploadedBookingAsset[];
  stylingAssets: UploadedBookingAsset[];
  uploadingConcern: boolean;
  uploadingStyling: boolean;
};

export function AdminBookingMetadataModal({
  isOpen,
  bookingLabel,
  initialSource,
  initialNote,
  initialServiceAddress,
  initialServiceLandmark,
  initialServicePincode,
  initialServiceLocationUrl,
  initialPets,
  isSubmitting,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  bookingLabel?: string;
  initialSource: string;
  initialNote?: string | null;
  initialServiceAddress?: string | null;
  initialServiceLandmark?: string | null;
  initialServicePincode?: string | null;
  initialServiceLocationUrl?: string | null;
  initialPets: Array<{
    bookingPetId: string;
    name: string | null;
    breed: string;
    concernPhotoAssets?: UploadedBookingAsset[];
    stylingReferenceAssets?: UploadedBookingAsset[];
  }>;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    bookingSource: string;
    adminNote: string;
    serviceAddress: string;
    serviceLandmark: string;
    servicePincode: string;
    serviceLocationUrl: string;
    pets: Array<{
      bookingPetId: string;
      concernAssets: SubmittedBookingAsset[];
      stylingAssets: SubmittedBookingAsset[];
    }>;
  }) => void;
}) {
  const [bookingSource, setBookingSource] = useState(initialSource);
  const [adminNote, setAdminNote] = useState(initialNote ?? "");
  const [serviceAddress, setServiceAddress] = useState(initialServiceAddress ?? "");
  const [serviceLandmark, setServiceLandmark] = useState(initialServiceLandmark ?? "");
  const [servicePincode, setServicePincode] = useState(initialServicePincode ?? "");
  const [serviceLocationUrl, setServiceLocationUrl] = useState(initialServiceLocationUrl ?? "");
  const [uploadError, setUploadError] = useState("");
  const [pets, setPets] = useState<EditableBookingPet[]>(
    initialPets.map((pet) => ({
      bookingPetId: pet.bookingPetId,
      name: pet.name,
      breed: pet.breed,
      concernAssets: pet.concernPhotoAssets ?? [],
      stylingAssets: pet.stylingReferenceAssets ?? [],
      uploadingConcern: false,
      uploadingStyling: false,
    }))
  );

  if (!isOpen) return null;

  const updatePet = (bookingPetId: string, patch: Partial<EditableBookingPet>) => {
    setPets((current) =>
      current.map((pet) => (pet.bookingPetId === bookingPetId ? { ...pet, ...patch } : pet))
    );
  };

  const uploadPetAssets = async (
    bookingPetId: string,
    kind: "styling_reference" | "concern_photo",
    files: FileList | null
  ) => {
    if (!files?.length) return;

    const petIndex = Math.max(
      0,
      pets.findIndex((pet) => pet.bookingPetId === bookingPetId)
    );
    updatePet(
      bookingPetId,
      kind === "styling_reference" ? { uploadingStyling: true } : { uploadingConcern: true }
    );
    setUploadError("");

    try {
      const uploadedAssets = await Promise.all(
        Array.from(files).map(async (file) => {
          const formData = new FormData();
          formData.set("file", file);
          formData.set("kind", kind);
          formData.set("petIndex", String(petIndex));

          const response = await fetch("/api/uploads/booking-asset", {
            method: "POST",
            body: formData,
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(data?.error ?? "Failed to upload image");
          }

          return data.asset as UploadedBookingAsset;
        })
      );

      setPets((current) =>
        current.map((pet) => {
          if (pet.bookingPetId !== bookingPetId) return pet;
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
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Failed to upload image");
      updatePet(
        bookingPetId,
        kind === "styling_reference" ? { uploadingStyling: false } : { uploadingConcern: false }
      );
    }
  };

  const removePetAsset = (
    bookingPetId: string,
    kind: "styling_reference" | "concern_photo",
    assetId: string
  ) => {
    setPets((current) =>
      current.map((pet) => {
        if (pet.bookingPetId !== bookingPetId) return pet;
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

  return (
    <div className="fixed inset-0 z-[410] flex items-center justify-center bg-black/30 p-4">
      <div className="flex max-h-[92vh] w-full max-w-[760px] flex-col rounded-[24px] bg-white p-6 shadow-2xl">
        <h3 className="text-[18px] font-black tracking-[-0.02em] text-[#1f1f2c]">Edit booking info</h3>
        {bookingLabel ? (
          <p className="mt-2 text-[13px] leading-[1.6] text-[#6b7280]">{bookingLabel}</p>
        ) : null}

        <div className="mt-5 space-y-4 overflow-y-auto pr-1">
          {uploadError ? (
            <div className="rounded-[14px] border border-[#f3d6d6] bg-[#fff7f7] px-4 py-3 text-[13px] text-[#b42318]">
              {uploadError}
            </div>
          ) : null}
          <label className="block">
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Source</div>
            <select
              value={bookingSource}
              onChange={(event) => setBookingSource(event.target.value)}
              className="h-[46px] w-full rounded-[14px] border border-[#ddd1fb] bg-white px-4 text-[14px] text-[#2a2346] outline-none focus:border-[#6d5bd0]"
            >
              {SOURCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Ops note</div>
            <textarea
              value={adminNote}
              onChange={(event) => setAdminNote(event.target.value)}
              rows={5}
              className="w-full rounded-[14px] border border-[#ddd1fb] px-4 py-3 text-[14px] text-[#2a2346] outline-none focus:border-[#6d5bd0]"
            />
          </label>

          <div className="rounded-[18px] border border-[#ece8f5] bg-[#faf9fd] p-4">
            <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Address & location</div>

            <div className="space-y-4">
              <label className="block">
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Service address</div>
                <textarea
                  value={serviceAddress}
                  onChange={(event) => setServiceAddress(event.target.value)}
                  rows={3}
                  placeholder="House / flat, street, area"
                  className="w-full rounded-[14px] border border-[#ddd1fb] px-4 py-3 text-[14px] text-[#2a2346] outline-none focus:border-[#6d5bd0]"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Landmark</div>
                  <input
                    type="text"
                    value={serviceLandmark}
                    onChange={(event) => setServiceLandmark(event.target.value)}
                    placeholder="Nearby landmark"
                    className="h-[46px] w-full rounded-[14px] border border-[#ddd1fb] px-4 text-[14px] text-[#2a2346] outline-none focus:border-[#6d5bd0]"
                  />
                </label>

                <label className="block">
                  <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Pin code</div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={servicePincode}
                    onChange={(event) => setServicePincode(event.target.value)}
                    placeholder="110001"
                    className="h-[46px] w-full rounded-[14px] border border-[#ddd1fb] px-4 text-[14px] text-[#2a2346] outline-none focus:border-[#6d5bd0]"
                  />
                </label>
              </div>

              <label className="block">
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">Google Maps link</div>
                <input
                  type="url"
                  value={serviceLocationUrl}
                  onChange={(event) => setServiceLocationUrl(event.target.value)}
                  placeholder="https://maps.google.com/..."
                  className="h-[46px] w-full rounded-[14px] border border-[#ddd1fb] px-4 text-[14px] text-[#2a2346] outline-none focus:border-[#6d5bd0]"
                />
              </label>
            </div>
          </div>

          <div className="rounded-[18px] border border-[#ece8f5] bg-[#faf9fd] p-4">
            <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">
              Pet images & styling references
            </div>

            <div className="space-y-4">
              {pets.map((pet) => (
                <div key={pet.bookingPetId} className="rounded-[16px] border border-[#ece8f5] bg-white p-4">
                  <div className="mb-3">
                    <div className="text-[14px] font-semibold text-[#2a2346]">
                      {pet.name?.trim() ? pet.name : "Unnamed pet"} · {pet.breed}
                    </div>
                    <p className="mt-1 text-[12px] text-[#7c8499]">
                      Add any photos the customer later shares on WhatsApp so the grooming team has the right visual context.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-[14px] border border-[#f0ecfa] bg-[#fcfbff] p-3">
                      <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">
                        Current / concern photos
                      </div>
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-[#ddd1fb] px-3 py-2 text-[12px] font-semibold text-[#6d5bd0] hover:bg-[#f6f4fd]">
                        {pet.uploadingConcern ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                        {pet.uploadingConcern ? "Uploading..." : "Upload images"}
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(event) => void uploadPetAssets(pet.bookingPetId, "concern_photo", event.target.files)}
                        />
                      </label>
                      {pet.concernAssets.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {pet.concernAssets.map((asset) => (
                            <div key={asset.id} className="relative">
                              <a href={asset.publicUrl} target="_blank" rel="noreferrer">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={asset.publicUrl}
                                  alt={asset.originalName}
                                  className="h-16 w-16 rounded-[10px] border border-[#ece5ff] object-cover"
                                />
                              </a>
                              <button
                                type="button"
                                onClick={() => removePetAsset(pet.bookingPetId, "concern_photo", asset.id)}
                                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#2a2346] text-white"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-[12px] text-[#8a90a6]">No current photos added yet.</p>
                      )}
                    </div>

                    <div className="rounded-[14px] border border-[#f0ecfa] bg-[#fcfbff] p-3">
                      <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a90a6]">
                        Styling reference images
                      </div>
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-[#ddd1fb] px-3 py-2 text-[12px] font-semibold text-[#6d5bd0] hover:bg-[#f6f4fd]">
                        {pet.uploadingStyling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                        {pet.uploadingStyling ? "Uploading..." : "Upload images"}
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(event) => void uploadPetAssets(pet.bookingPetId, "styling_reference", event.target.files)}
                        />
                      </label>
                      {pet.stylingAssets.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {pet.stylingAssets.map((asset) => (
                            <div key={asset.id} className="relative">
                              <a href={asset.publicUrl} target="_blank" rel="noreferrer">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={asset.publicUrl}
                                  alt={asset.originalName}
                                  className="h-16 w-16 rounded-[10px] border border-[#ece5ff] object-cover"
                                />
                              </a>
                              <button
                                type="button"
                                onClick={() => removePetAsset(pet.bookingPetId, "styling_reference", asset.id)}
                                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#2a2346] text-white"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-[12px] text-[#8a90a6]">No styling references added yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[12px] border border-[#ece8f5] px-4 py-2 text-[13px] font-semibold text-[#6b7280] hover:bg-[#f6f4fd]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() =>
              onSubmit({
                bookingSource,
                adminNote,
                serviceAddress,
                serviceLandmark,
                servicePincode,
                serviceLocationUrl,
                pets: pets.map((pet) => ({
                  bookingPetId: pet.bookingPetId,
                  concernAssets: pet.concernAssets.map((asset) => ({
                    storageKey: asset.storageKey,
                    publicUrl: asset.publicUrl,
                    originalName: asset.originalName,
                  })),
                  stylingAssets: pet.stylingAssets.map((asset) => ({
                    storageKey: asset.storageKey,
                    publicUrl: asset.publicUrl,
                    originalName: asset.originalName,
                  })),
                })),
              })
            }
            className="rounded-[12px] bg-[#6d5bd0] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#5b4ab5] disabled:opacity-60"
          >
            {isSubmitting ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
