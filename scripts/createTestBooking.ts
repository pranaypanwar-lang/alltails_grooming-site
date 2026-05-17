import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  // Find first active team member
  const member = await prisma.teamMember.findFirst({
    where: { isActive: true },
    select: { id: true, name: true },
  });
  if (!member) throw new Error("No active team member found");

  // Find Complete Pampering service (shows all pacer cards)
  const service = await prisma.service.findFirst({
    where: { name: { contains: "Pampering" } },
    select: { id: true, name: true, price: true },
  });
  if (!service) throw new Error("No pampering service found");

  // Create test user (or reuse existing test user)
  let user = await prisma.user.findFirst({ where: { phone: "+919999900001" }, select: { id: true } });
  if (!user) {
    user = await prisma.user.create({
      data: { phone: "+919999900001", name: "Test Customer", city: "Delhi" },
      select: { id: true },
    });
  }

  // Create test pet with rich data for pacer card context
  const pet = await prisma.pet.upsert({
    where: { id: "test-pet-pacer-001" },
    update: {
      temperament: "nervous and shy, gets anxious around strangers",
      defaultGroomingNotes: "Gentle approach only. Gets stressed during blow dry — use low heat. Mats near ears.",
      defaultStylingNotes: "Puppy cut requested. Keep face fur short, round the ears. Owner prefers 1 inch length on body.",
    },
    create: {
      id: "test-pet-pacer-001",
      name: "Bruno",
      breed: "Golden Retriever",
      userId: user.id,
      species: "dog",
      temperament: "nervous and shy, gets anxious around strangers",
      defaultGroomingNotes: "Gentle approach only. Gets stressed during blow dry — use low heat. Mats near ears.",
      defaultStylingNotes: "Puppy cut requested. Keep face fur short, round the ears. Owner prefers 1 inch length on body.",
    },
  });

  // Create booking for today
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const booking = await prisma.booking.create({
    data: {
      userId: user.id,
      serviceId: service.id,
      status: "confirmed",
      paymentMethod: "pay_now",
      paymentStatus: "paid",
      originalAmount: service.price,
      finalAmount: service.price,
      selectedDate: today,
      serviceAddress: "123 Test Lane, Saket",
      servicePincode: "110017",
      bookingSource: "manual_internal",
      groomerMemberId: member.id,
      dispatchState: "assigned",
      pets: {
        create: {
          petId: pet.id,
          isSavedProfile: true,
          temperament: null, // will fall back to pet default
          groomingNotes: null,
          stylingNotes: null,
        },
      },
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `https://${process.env.NEXT_PUBLIC_APP_URL}`
    : "http://localhost:3000";

  console.log("\n✅ Test booking created");
  console.log(`   Booking ID : ${booking.id}`);
  console.log(`   Groomer    : ${member.name} (${member.id})`);
  console.log(`   Pet        : ${pet.name} the ${pet.breed}`);
  console.log(`   Service    : ${service.name}`);
  console.log(`   Date       : ${today}`);
  console.log(`\n🔗 Groomer Home URL:`);
  console.log(`   ${appUrl}/groomer/home/${member.id}`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
