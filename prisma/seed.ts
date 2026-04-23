import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  try {
    console.log("🚀 Seeding started...");

    // ── Wipe in dependency order ──────────────────────────────────────────────
    await prisma.couponRedemption.deleteMany();
    await prisma.bookingSlot.deleteMany();
    await prisma.bookingPet.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.coupon.deleteMany();
    await prisma.slot.deleteMany();
    await prisma.teamCoverageArea.deleteMany();
    await prisma.teamCoverageRule.deleteMany();
    await prisma.team.deleteMany();
    await prisma.serviceArea.deleteMany();
    await prisma.service.deleteMany();
    await prisma.pet.deleteMany();
    await prisma.user.deleteMany();

    // ── Services ─────────────────────────────────────────────────────────────
    await prisma.service.createMany({
      data: [
        { name: "Complete Pampering", price: 1799 },
        { name: "Essential Care",     price: 999  },
        { name: "Signature Care",     price: 1299 },
        { name: "Starter Plan",       price: 3799 },
        { name: "Care Plan",          price: 6999 },
        { name: "Wellness Plan",      price: 14999 },
      ],
    });
    console.log("✅ Services created");

    await prisma.coupon.createMany({
      data: [
        {
          code: "FIRST10",
          title: "First booking 10% off",
          description: "Valid on a customer's first prepaid booking across all cities.",
          isActive: true,
          discountType: "percent",
          discountValue: 10,
          stackable: true,
          firstBookingOnly: true,
          applicableServiceNames: [],
          applicableCities: [],
          paymentMethods: ["pay_now"],
        },
        {
          code: "MULTIPET5",
          title: "5% off per extra pet",
          description: "Stackable multi-pet offer for prepaid bookings. Gives 5% off for every extra pet in the same booking.",
          isActive: true,
          discountType: "per_extra_pet_percent",
          discountValue: 5,
          stackable: true,
          firstBookingOnly: false,
          applicableServiceNames: [],
          applicableCities: [],
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
          applicableCities: [],
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
          applicableCities: [],
          paymentMethods: ["pay_now"],
        },
      ],
    });
    console.log("✅ Coupons created");

    // ── Service areas ─────────────────────────────────────────────────────────
    const areas = await prisma.$transaction(
      [
        { name: "Delhi",          slug: "delhi"          },
        { name: "Gurgaon",        slug: "gurgaon"        },
        { name: "Noida",          slug: "noida"          },
        { name: "Greater Noida",  slug: "greater-noida"  },
        { name: "Ghaziabad",      slug: "ghaziabad"      },
        { name: "Faridabad",      slug: "faridabad"      },
        { name: "Chandigarh",     slug: "chandigarh"     },
        { name: "Ludhiana",       slug: "ludhiana"       },
        { name: "Patiala",        slug: "patiala"        },
      ].map((a) => prisma.serviceArea.create({ data: a }))
    );

    const areaBySlug = Object.fromEntries(areas.map((a) => [a.slug, a]));
    console.log("✅ Service areas created");

    // ── Teams ─────────────────────────────────────────────────────────────────
    const [punjabTeam, ncrRegionalTeam, delhiGurgaonTeam] = await prisma.$transaction([
      prisma.team.create({ data: { name: "Punjab Rotating Team" } }),
      prisma.team.create({ data: { name: "NCR Regional Team"    } }),
      prisma.team.create({ data: { name: "Delhi & Gurgaon Team" } }),
    ]);
    console.log("✅ Teams created");

    // ── Coverage rules ────────────────────────────────────────────────────────
    // Weekday map: 0 Sun, 1 Mon, 2 Tue (OFF for all), 3 Wed, 4 Thu, 5 Fri, 6 Sat

    // Punjab rotating team — single city per active weekday
    const punjabSchedule: Array<{ weekday: number; slug: string | null }> = [
      { weekday: 0, slug: "chandigarh" }, // Sun
      { weekday: 1, slug: "chandigarh" }, // Mon
      { weekday: 2, slug: null          }, // Tue OFF
      { weekday: 3, slug: "ludhiana"   }, // Wed
      { weekday: 4, slug: "chandigarh" }, // Thu
      { weekday: 5, slug: "patiala"    }, // Fri
      { weekday: 6, slug: "ludhiana"   }, // Sat
    ];

    for (const { weekday, slug } of punjabSchedule) {
      const rule = await prisma.teamCoverageRule.create({
        data: {
          teamId:       punjabTeam.id,
          weekday,
          coverageType: slug ? "SINGLE_CITY" : "OFF",
        },
      });
      if (slug) {
        await prisma.teamCoverageArea.create({
          data: {
            coverageRuleId: rule.id,
            serviceAreaId:  areaBySlug[slug].id,
          },
        });
      }
    }

    // NCR regional team — regional pool (Noida / Greater Noida / Ghaziabad / Faridabad)
    // Active Mon, Wed–Sun; OFF Tue
    const ncrPoolSlugs = ["noida", "greater-noida", "ghaziabad", "faridabad"];
    for (let weekday = 0; weekday <= 6; weekday++) {
      const isOff = weekday === 2;
      const rule = await prisma.teamCoverageRule.create({
        data: {
          teamId:       ncrRegionalTeam.id,
          weekday,
          coverageType: isOff ? "OFF" : "REGIONAL_POOL",
        },
      });
      if (!isOff) {
        for (const slug of ncrPoolSlugs) {
          await prisma.teamCoverageArea.create({
            data: {
              coverageRuleId: rule.id,
              serviceAreaId:  areaBySlug[slug].id,
            },
          });
        }
      }
    }

    // Delhi & Gurgaon team — regional pool covering Delhi + Gurgaon
    const delhiGurgaonSlugs = ["delhi", "gurgaon"];
    for (let weekday = 0; weekday <= 6; weekday++) {
      const isOff = weekday === 2;
      const rule = await prisma.teamCoverageRule.create({
        data: {
          teamId:       delhiGurgaonTeam.id,
          weekday,
          coverageType: isOff ? "OFF" : "REGIONAL_POOL",
        },
      });
      if (!isOff) {
        for (const slug of delhiGurgaonSlugs) {
          await prisma.teamCoverageArea.create({
            data: {
              coverageRuleId: rule.id,
              serviceAreaId:  areaBySlug[slug].id,
            },
          });
        }
      }
    }

    console.log("✅ Coverage rules created");
    console.log("🌱 Seeding completed — run ensureSlotsExistForDateRange to generate slots");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("❌ Seed failed:", error);
  process.exit(1);
});
