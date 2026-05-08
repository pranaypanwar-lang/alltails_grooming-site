export const isValidIndianMobile = (phone: string) =>
  /^[6-9]\d{9}$/.test(phone.replace(/\D/g, "").slice(-10));

export const hasMeaningfulBookingInput = (input: {
  serviceChanged: boolean;
  city: string;
  selectedDate: string;
  selectedBookingWindowId: string;
  name: string;
  phone: string;
  pets: Array<{ name: string; breed: string; stylingNotes?: string; groomingNotes?: string }>;
}) =>
  input.serviceChanged ||
  Boolean(input.city.trim()) ||
  Boolean(input.selectedDate.trim()) ||
  Boolean(input.selectedBookingWindowId.trim()) ||
  Boolean(input.name.trim()) ||
  Boolean(input.phone.trim()) ||
  input.pets.some(
    (pet) =>
      Boolean(pet.name.trim()) ||
      Boolean(pet.breed.trim()) ||
      Boolean(pet.stylingNotes?.trim()) ||
      Boolean(pet.groomingNotes?.trim())
  );
