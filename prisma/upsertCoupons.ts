import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma";

const COUPONS = [
  {
    code: "FIRST10",
    title: "First booking 10% off",
    description: "Valid on a customer's first prepaid booking across all cities.",
    isActive: true,
    discountType: "percent",
    discountValue: 10,
    stackable: true,
    firstBookingOnly: true,
    applicableServiceNames: [] as string[],
    applicableCities: [] as string[],
    paymentMethods: ["pay_now"],
  },
  {
    code: "MULTIPET5",
    title: "5% off per pet",
    description:
      "Stackable multi-pet offer for prepaid bookings. Gives 5% off for each pet in the same booking.",
    isActive: true,
    discountType: "per_extra_pet_percent",
    discountValue: 5,
    stackable: true,
    firstBookingOnly: false,
    applicableServiceNames: [] as string[],
    applicableCities: [] as string[],
    paymentMethods: ["pay_now"],
  },
  {
    code: "SIGNATURE5",
    title: "Signature Care 5% off",
    description: "Prepaid discount for Signature Care across all cities.",
    isActive: true,
    discountType: "percent",
    discountValue: 5,
    stackable: false,
    firstBookingOnly: false,
    applicableServiceNames: ["Signature Care"],
    applicableCities: [] as string[],
    paymentMethods: ["pay_now"],
  },
  {
    code: "COMPLETE10",
    title: "Complete Pampering 10% off",
    description: "Prepaid discount for Complete Pampering across all cities.",
    isActive: true,
    discountType: "percent",
    discountValue: 10,
    stackable: false,
    firstBookingOnly: false,
    applicableServiceNames: ["Complete Pampering"],
    applicableCities: [] as string[],
    paymentMethods: ["pay_now"],
  },
];

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  try {
    for (const coupon of COUPONS) {
      await prisma.coupon.upsert({
        where: { code: coupon.code },
        update: coupon,
        create: coupon,
      });
      console.log(`Upserted coupon ${coupon.code}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Coupon upsert failed:", error);
  process.exit(1);
});
