import { getAddressReadinessSummary } from "../booking/addressCapture";

export type CustomerMessageType = "booking_confirmation";
export type ExtendedCustomerMessageType =
  | "booking_confirmation"
  | "booking_cancelled_confirmation"
  | "booking_rescheduled_confirmation"
  | "payment_retry_reminder"
  | "team_on_the_way"
  | "groomer_delay_update"
  | "night_before_reminder"
  | "post_groom_care"
  | "review_request"
  | "rebooking_reminder"
  | "periodic_care_tip"
  | "custom_offer";

type CustomerBookingMessageInput = {
  bookingId: string;
  customerName: string;
  customerPhone: string;
  city: string | null;
  serviceName: string;
  selectedDate: string | null;
  windowLabel: string | null;
  paymentStatusLabel: string;
  paymentMethodLabel: string | null;
  finalAmount: number;
  serviceAddress?: string | null;
  serviceLandmark?: string | null;
  servicePincode?: string | null;
  serviceLocationUrl?: string | null;
  customText?: string | null;
  offerCode?: string | null;
};

function getFirstName(name: string) {
  return name.trim().split(/\s+/)[0] || "there";
}

function formatAmount(value: number) {
  return `Rs ${value.toLocaleString("en-IN")}`;
}

function normalizeRecipient(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function getSupportNumber() {
  const raw =
    process.env.SUPPORT_WHATSAPP_NUMBER?.trim() ||
    process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_NUMBER?.trim() ||
    "";
  return raw.replace(/\D/g, "");
}

export function buildCustomerMessage(input: CustomerBookingMessageInput, messageType: ExtendedCustomerMessageType) {
  const customerFirstName = getFirstName(input.customerName);
  const bookingRef = input.bookingId.slice(0, 8);
  const supportNumber = getSupportNumber();
  const addressInfo = getAddressReadinessSummary(input);

  const supportLine = supportNumber
    ? `Need help? WhatsApp us here: https://wa.me/${supportNumber}`
    : "Need help? Reply here and our team will assist you.";

  let body = "";

  if (messageType === "booking_confirmation") {
    body = [
      `Hi ${customerFirstName}, your All Tails booking is confirmed.`,
      "",
      `Booking Ref: ${bookingRef}`,
      `Service: ${input.serviceName}`,
      `Date: ${input.selectedDate ?? "TBD"}`,
      `Time: ${input.windowLabel ?? "TBD"}`,
      `Area: ${input.city ?? "TBD"}`,
      `Payment: ${input.paymentStatusLabel}${input.paymentMethodLabel ? ` (${input.paymentMethodLabel})` : ""}`,
      `Amount: ${formatAmount(input.finalAmount)}`,
      "",
      addressInfo.status === "complete"
        ? "Your service address is already saved with this booking."
        : "Please complete the saved address step on your booking confirmation screen before the visit.",
      supportLine,
      "",
      `Namaste ${customerFirstName}, aapki All Tails booking confirm ho gayi hai.`,
      "",
      `Booking Ref: ${bookingRef}`,
      `Service: ${input.serviceName}`,
      `Date: ${input.selectedDate ?? "TBD"}`,
      `Time: ${input.windowLabel ?? "TBD"}`,
      `Area: ${input.city ?? "TBD"}`,
      `Payment: ${input.paymentStatusLabel}${input.paymentMethodLabel ? ` (${input.paymentMethodLabel})` : ""}`,
      `Amount: ${formatAmount(input.finalAmount)}`,
      "",
      addressInfo.status === "complete"
        ? "Aapka service address is booking ke saath save ho chuka hai."
        : "Kripya visit se pehle booking confirmation screen par apna address step complete kar dein.",
      supportLine,
    ]
      .join("\n");
  } else if (messageType === "night_before_reminder") {
    body = [
      `Hi ${customerFirstName}, this is a reminder for your All Tails grooming tomorrow.`,
      "",
      `Booking Ref: ${bookingRef}`,
      `Service: ${input.serviceName}`,
      `Date: ${input.selectedDate ?? "TBD"}`,
      `Time: ${input.windowLabel ?? "TBD"}`,
      "Please keep your pet ready a little before the slot.",
      addressInfo.status === "complete"
        ? "We already have your address and location details."
        : "Please send your full address and Google Maps link if you have not shared them yet.",
      supportLine,
      "",
      `Namaste ${customerFirstName}, kal aapki All Tails grooming booking hai.`,
      "",
      `Booking Ref: ${bookingRef}`,
      `Service: ${input.serviceName}`,
      `Date: ${input.selectedDate ?? "TBD"}`,
      `Time: ${input.windowLabel ?? "TBD"}`,
      "Kripya slot se thoda pehle apne pet ko ready rakhein.",
      addressInfo.status === "complete"
        ? "Hamare paas aapka address aur location details already hai."
        : "Agar abhi tak share nahi kiya hai to apna full address aur Google Maps link bhej dein.",
      supportLine,
    ].join("\n");
  } else if (messageType === "booking_cancelled_confirmation") {
    body = [
      `Hi ${customerFirstName}, your All Tails booking has been cancelled as requested.`,
      "",
      `Booking Ref: ${bookingRef}`,
      `Service: ${input.serviceName}`,
      `Date: ${input.selectedDate ?? "TBD"}`,
      `Time: ${input.windowLabel ?? "TBD"}`,
      "If you would like to reschedule, just reply to us and our team will help.",
      supportLine,
      "",
      `Namaste ${customerFirstName}, aapki All Tails booking aapki request par cancel kar di gayi hai.`,
      "",
      `Booking Ref: ${bookingRef}`,
      `Service: ${input.serviceName}`,
      `Date: ${input.selectedDate ?? "TBD"}`,
      `Time: ${input.windowLabel ?? "TBD"}`,
      "Agar aap reschedule karna chahte hain to humein reply karein, hamari team help karegi.",
      supportLine,
    ].join("\n");
  } else if (messageType === "booking_rescheduled_confirmation") {
    body = [
      `Hi ${customerFirstName}, your All Tails booking has been rescheduled successfully.`,
      "",
      `Booking Ref: ${bookingRef}`,
      `Service: ${input.serviceName}`,
      `New date: ${input.selectedDate ?? "TBD"}`,
      `New time: ${input.windowLabel ?? "TBD"}`,
      `Area: ${input.city ?? "TBD"}`,
      supportLine,
      "",
      `Namaste ${customerFirstName}, aapki All Tails booking successfully reschedule ho gayi hai.`,
      "",
      `Booking Ref: ${bookingRef}`,
      `Service: ${input.serviceName}`,
      `New date: ${input.selectedDate ?? "TBD"}`,
      `New time: ${input.windowLabel ?? "TBD"}`,
      `Area: ${input.city ?? "TBD"}`,
      supportLine,
    ].join("\n");
  } else if (messageType === "payment_retry_reminder") {
    body = [
      `Hi ${customerFirstName}, your All Tails payment is still pending.`,
      "",
      `Booking Ref: ${bookingRef}`,
      `Service: ${input.serviceName}`,
      `Date: ${input.selectedDate ?? "TBD"}`,
      `Time: ${input.windowLabel ?? "TBD"}`,
      `Amount: ${formatAmount(input.finalAmount)}`,
      input.customText || "Please complete payment using the link shared by our support team.",
      supportLine,
      "",
      `Namaste ${customerFirstName}, aapki All Tails payment abhi pending hai.`,
      "",
      `Booking Ref: ${bookingRef}`,
      `Service: ${input.serviceName}`,
      `Date: ${input.selectedDate ?? "TBD"}`,
      `Time: ${input.windowLabel ?? "TBD"}`,
      `Amount: ${formatAmount(input.finalAmount)}`,
      input.customText || "Kripya hamari support team ke share kiye gaye payment link se payment complete karein.",
      supportLine,
    ]
      .filter(Boolean)
      .join("\n");
  } else if (messageType === "team_on_the_way") {
    body = [
      `Hi ${customerFirstName}, your All Tails team is on the way.`,
      "",
      `Booking Ref: ${bookingRef}`,
      `Service: ${input.serviceName}`,
      `Date: ${input.selectedDate ?? "TBD"}`,
      `Time: ${input.windowLabel ?? "TBD"}`,
      "Please keep your pet ready and keep your phone nearby in case the team needs help reaching you.",
      supportLine,
      "",
      `Namaste ${customerFirstName}, aapki All Tails team ab raste mein hai.`,
      "",
      `Booking Ref: ${bookingRef}`,
      `Service: ${input.serviceName}`,
      `Date: ${input.selectedDate ?? "TBD"}`,
      `Time: ${input.windowLabel ?? "TBD"}`,
      "Kripya apne pet ko ready rakhein aur zarurat padne par call lene ke liye phone paas rakhein.",
      supportLine,
    ].join("\n");
  } else if (messageType === "groomer_delay_update") {
    body = [
      `Hi ${customerFirstName}, we are actively coordinating your All Tails team for the upcoming booking.`,
      "",
      `Booking Ref: ${bookingRef}`,
      `Service: ${input.serviceName}`,
      `Time: ${input.windowLabel ?? "TBD"}`,
      "There may be a short delay in the team's departure, and our operations team is following up right now.",
      "We will keep you updated.",
      supportLine,
      "",
      `Namaste ${customerFirstName}, hum aapki upcoming All Tails booking ke liye team ke saath actively coordinate kar rahe hain.`,
      "",
      `Booking Ref: ${bookingRef}`,
      `Service: ${input.serviceName}`,
      `Time: ${input.windowLabel ?? "TBD"}`,
      "Team ke nikalne mein thoda delay ho sakta hai aur hamari operations team is par abhi kaam kar rahi hai.",
      "Hum aapko updated rakhenge.",
      supportLine,
    ].join("\n");
  } else if (messageType === "post_groom_care") {
    body = [
      `Hi ${customerFirstName}, thank you for choosing All Tails.`,
      "",
      `Your ${input.serviceName} session is completed.`,
      "Post-groom care tips:",
      "1. Give your pet some water and rest.",
      "2. Avoid rough outdoor play for a short while.",
      "3. If you notice any skin sensitivity, message us immediately.",
      "",
      "We would love to see your pet happy and comfortable after the session.",
      supportLine,
      "",
      `Namaste ${customerFirstName}, All Tails choose karne ke liye dhanyavaad.`,
      "",
      `Aapki ${input.serviceName} session complete ho gayi hai.`,
      "Post-groom care tips:",
      "1. Pet ko paani aur thoda rest dein.",
      "2. Thodi der tak rough outdoor play avoid karein.",
      "3. Agar skin sensitivity dikhe to humein turant message karein.",
      "",
      "Humein khushi hogi agar aapka pet session ke baad comfortable ho.",
      supportLine,
    ].join("\n");
  } else if (messageType === "review_request") {
    body = [
      `Hi ${customerFirstName}, we hope your All Tails session went well.`,
      "",
      "If you loved the experience, please share a quick review:",
      "Your feedback helps us and our grooming team improve.",
      supportLine,
      "",
      `Namaste ${customerFirstName}, umeed hai aapko All Tails session pasand aaya hoga.`,
      "",
      "Agar experience achha laga ho to ek chhota sa review share karein.",
      "Aapka feedback humein aur hamari grooming team ko improve karne mein madad karta hai.",
      supportLine,
    ].join("\n");
  } else if (messageType === "rebooking_reminder") {
    body = [
      `Hi ${customerFirstName}, it has been about 5 weeks since your last All Tails grooming session.`,
      "",
      "This is a good time to book the next grooming slot for your pet.",
      `Last service: ${input.serviceName}`,
      input.customText || "Reply to us if you want help choosing the next slot.",
      supportLine,
      "",
      `Namaste ${customerFirstName}, aapki last All Tails grooming ko lagbhag 5 hafte ho gaye hain.`,
      "",
      "Ab next grooming slot book karne ka achha time hai.",
      `Last service: ${input.serviceName}`,
      input.customText || "Agar next slot choose karne mein help chahiye ho to humein reply karein.",
      supportLine,
    ].join("\n");
  } else if (messageType === "periodic_care_tip") {
    body = [
      `Hi ${customerFirstName}, here is a quick pet care tip from All Tails.`,
      "",
      input.customText || "Brush your pet regularly and keep the coat dry and clean between sessions.",
      supportLine,
      "",
      `Namaste ${customerFirstName}, All Tails ki taraf se ek quick pet care tip.`,
      "",
      input.customText || "Regular brushing karein aur next session tak coat ko clean aur dry rakhein.",
      supportLine,
    ].join("\n");
  } else {
    body = [
      `Hi ${customerFirstName}, we have a special All Tails offer for you.`,
      "",
      input.customText || "Book your next grooming session and enjoy a customised offer from our team.",
      input.offerCode ? `Offer code: ${input.offerCode}` : "",
      supportLine,
      "",
      `Namaste ${customerFirstName}, aapke liye All Tails ka ek special offer hai.`,
      "",
      input.customText || "Apni next grooming session book karein aur hamari team se customised offer ka fayda uthayein.",
      input.offerCode ? `Offer code: ${input.offerCode}` : "",
      supportLine,
    ]
      .filter(Boolean)
      .join("\n");
  }

  const recipient = normalizeRecipient(input.customerPhone);
  const whatsappUrl = recipient
    ? `https://wa.me/${recipient}?text=${encodeURIComponent(body)}`
    : null;

  return {
    messageType,
    language: "en_hi" as const,
    channel: "whatsapp_manual" as const,
    recipient,
    body,
    whatsappUrl,
    addressStatus: addressInfo.status,
  };
}
