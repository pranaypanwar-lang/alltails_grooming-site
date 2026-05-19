import "dotenv/config";
import { createHmac } from "crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma";

const PHONE = "9717878052";
const FULL_PHONE = "+91" + PHONE;
const NAME = "Pranay Panwar";
const TTL_SECS = 60 * 60 * 24 * 30; // 30 days

function createToken(bookingId: string, phone: string): string {
  const secret = process.env.BOOKING_ACCESS_TOKEN_SECRET?.trim() || process.env.ADMIN_SESSION_SECRET?.trim();
  if (!secret) throw new Error("No token secret found in .env");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ bookingId, phone, exp: now + TTL_SECS }), "utf8").toString("base64url");
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  // Find or create user
  let user = await prisma.user.findFirst({ where: { phone: FULL_PHONE }, select: { id: true, name: true } });
  if (!user) {
    user = await prisma.user.create({
      data: { phone: FULL_PHONE, name: NAME, city: "Delhi" },
      select: { id: true, name: true },
    });
    console.log("Created user:", NAME);
  } else {
    // Update name if needed
    await prisma.user.update({ where: { id: user.id }, data: { name: NAME } });
    console.log("Found existing user:", user.name);
  }

  // Find Complete Pampering service
  const service = await prisma.service.findFirst({
    where: { name: { contains: "Pampering" } },
    select: { id: true, name: true, price: true },
  });
  if (!service) throw new Error("No 'Complete Pampering' service found in DB");

  // Find first active team + groomer
  const team = await prisma.team.findFirst({
    where: { isActive: true },
    select: { id: true, name: true },
  });
  if (!team) throw new Error("No active team found");

  const member = await prisma.teamMember.findFirst({
    where: { teamId: team.id, isActive: true, role: "groomer" },
    select: { id: true, name: true },
  });
  if (!member) throw new Error("No active groomer in team");

  // Find or create pet for Pranay
  let pet = await prisma.pet.findFirst({
    where: { userId: user.id },
    select: { id: true, name: true, breed: true },
  });
  if (!pet) {
    pet = await prisma.pet.create({
      data: {
        userId: user.id,
        name: "Max",
        breed: "Beagle",
        species: "dog",
        temperament: "wiggle_worrier",
        defaultGroomingNotes: "Sensitive skin — use hypoallergenic shampoo. Gets anxious with blow dryer, keep on low heat.",
        defaultStylingNotes: "Short trim, tidy ears. Do not shave completely.",
      },
      select: { id: true, name: true, breed: true },
    });
    console.log("Created pet: Max the Beagle");
  } else {
    console.log(`Found pet: ${pet.name} the ${pet.breed}`);
  }

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());

  // Build manual booking window id: "manual__<teamId>__<date>__<startTime>__<endTime>"
  const bookingWindowId = `manual__${team.id}__${today}__11:00__13:00`;

  const booking = await prisma.booking.create({
    data: {
      userId: user.id,
      serviceId: service.id,
      status: "confirmed",
      paymentMethod: "pay_after_service",
      paymentStatus: "unpaid",
      originalAmount: service.price,
      finalAmount: service.price,
      selectedDate: today,
      bookingWindowId,
      serviceAddress: "B-14, Greater Kailash Part 1",
      serviceLandmark: "Near M Block Market",
      servicePincode: "110048",
      bookingSource: "manual_internal",
      assignedTeamId: team.id,
      groomerMemberId: member.id,
      dispatchState: "assigned",
      adminNote: "Owner requested scissors only on face. Dog is nervous with clippers — befriend first, go slow.",
      pets: {
        create: {
          petId: pet.id,
          isSavedProfile: true,
          groomingNotes: "Sensitive skin — use hypoallergenic shampoo. Gets anxious with blow dryer.",
          stylingNotes: "Short trim, tidy ears. Owner said do not shave completely.",
          temperament: "wiggle_worrier",
        },
      },
    },
    select: { id: true },
  });

  // Initialise SOP steps so they exist in DB
  const { getSopStepsForService } = await import("../lib/booking/sop");
  const sopDefs = getSopStepsForService(service.name);
  for (const def of sopDefs) {
    await prisma.bookingSopStep.upsert({
      where: { bookingId_stepKey: { bookingId: booking.id, stepKey: def.key } },
      update: {},
      create: { bookingId: booking.id, stepKey: def.key, status: "pending" },
    });
  }

  // Set a groomer note on bath_dry_proof so the note UI is visible immediately
  await prisma.bookingSopStep.update({
    where: { bookingId_stepKey: { bookingId: booking.id, stepKey: "bath_dry_proof" } },
    data: { notes: "Use hypoallergenic shampoo — Max has sensitive skin. Keep blow dryer on low heat, he gets anxious. Take your time." },
  });

  const token = createToken(booking.id, PHONE);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `https://${process.env.NEXT_PUBLIC_APP_URL}`
    : "http://localhost:3000";

  console.log("\n✅ Booking created successfully");
  console.log(`   Booking ID  : ${booking.id}`);
  console.log(`   Customer    : ${NAME} (${FULL_PHONE})`);
  console.log(`   Pet         : ${pet.name} the ${pet.breed}`);
  console.log(`   Service     : ${service.name} — ₹${service.price}`);
  console.log(`   Groomer     : ${member.name}`);
  console.log(`   Date        : ${today}`);
  console.log(`   Dispatch    : assigned`);
  console.log(`\n🔗 Groomer Job Link (share this with the groomer):`);
  console.log(`   ${appUrl}/groomer/jobs/${booking.id}?token=${token}`);
  console.log(`\n📱 Local dev link:`);
  console.log(`   http://localhost:3000/groomer/jobs/${booking.id}?token=${token}`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
