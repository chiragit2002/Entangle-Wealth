import { db } from "@workspace/db";
import { usersTable, paperPortfoliosTable, paperTradesTable, paperPositionsTable } from "@workspace/db/schema";
import { eq, asc, inArray, notInArray } from "drizzle-orm";

const EARLY_ADOPTER_CASH = 1_000_000;
const DEFAULT_CASH = 100_000;
const EARLY_ADOPTER_LIMIT = 20_000;

async function main() {
  console.log("Starting portfolio reset + early adopter bonus migration...");

  const allUsers = await db
    .select({ id: usersTable.id, createdAt: usersTable.createdAt })
    .from(usersTable)
    .orderBy(asc(usersTable.createdAt));

  console.log(`Found ${allUsers.length} total users`);

  const earlyAdopters = allUsers.slice(0, EARLY_ADOPTER_LIMIT);
  const regularUsers = allUsers.slice(EARLY_ADOPTER_LIMIT);
  const earlyAdopterIds = earlyAdopters.map((u) => u.id);
  const regularIds = regularUsers.map((u) => u.id);

  console.log(`Identified ${earlyAdopters.length} early adopters`);

  console.log("Deleting all paper trades...");
  await db.delete(paperTradesTable);
  console.log("Deleted all paper trades.");

  console.log("Deleting all paper positions...");
  await db.delete(paperPositionsTable);
  console.log("Deleted all paper positions.");

  console.log("Marking early adopters in users table...");
  if (earlyAdopterIds.length > 0) {
    const BATCH = 500;
    for (let i = 0; i < earlyAdopterIds.length; i += BATCH) {
      const chunk = earlyAdopterIds.slice(i, i + BATCH);
      await db
        .update(usersTable)
        .set({ isEarlyAdopter: true })
        .where(inArray(usersTable.id, chunk));
    }
  }
  if (regularIds.length > 0) {
    const BATCH = 500;
    for (let i = 0; i < regularIds.length; i += BATCH) {
      const chunk = regularIds.slice(i, i + BATCH);
      await db
        .update(usersTable)
        .set({ isEarlyAdopter: false })
        .where(inArray(usersTable.id, chunk));
    }
  }
  console.log("Updated isEarlyAdopter flags.");

  console.log("Resetting portfolio balances for early adopters...");
  const BATCH = 500;
  if (earlyAdopterIds.length > 0) {
    for (let i = 0; i < earlyAdopterIds.length; i += BATCH) {
      const chunk = earlyAdopterIds.slice(i, i + BATCH);
      await db
        .update(paperPortfoliosTable)
        .set({ cashBalance: EARLY_ADOPTER_CASH, updatedAt: new Date() })
        .where(inArray(paperPortfoliosTable.userId, chunk));
    }
  }

  console.log("Resetting portfolio balances for regular users...");
  if (regularIds.length > 0) {
    for (let i = 0; i < regularIds.length; i += BATCH) {
      const chunk = regularIds.slice(i, i + BATCH);
      await db
        .update(paperPortfoliosTable)
        .set({ cashBalance: DEFAULT_CASH, updatedAt: new Date() })
        .where(inArray(paperPortfoliosTable.userId, chunk));
    }
  }

  console.log(`Reset ${earlyAdopters.length} early adopter portfolios to $${EARLY_ADOPTER_CASH.toLocaleString()}`);
  console.log(`Reset ${regularUsers.length} regular portfolios to $${DEFAULT_CASH.toLocaleString()}`);
  console.log("Migration complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
