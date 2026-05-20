import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Count completed bookings per groomer
  const rows = await prisma.booking.groupBy({
    by: ["groomerMemberId"],
    where: {
      status: "completed",
      groomerMemberId: { not: null },
    },
    _count: { id: true },
    _max: { updatedAt: true },
  });

  console.log(`Found ${rows.length} groomers with completed bookings`);

  let updated = 0;
  for (const row of rows) {
    if (!row.groomerMemberId) continue;
    const count = row._count.id;
    const lastAt = row._max.updatedAt;

    await prisma.teamMember.update({
      where: { id: row.groomerMemberId },
      data: {
        completedCount: count,
        lastCompletedAt: lastAt,
      },
    });

    console.log(`  groomerMemberId=${row.groomerMemberId} → completedCount=${count}, lastCompletedAt=${lastAt?.toISOString()}`);
    updated++;
  }

  console.log(`\nBackfill complete — updated ${updated} groomer(s).`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
