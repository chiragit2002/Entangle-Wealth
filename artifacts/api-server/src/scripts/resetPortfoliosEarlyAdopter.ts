import { db } from "@workspace/db";
import { paperPortfoliosTable, paperTradesTable, paperPositionsTable } from "@workspace/db/schema";
import { gt } from "drizzle-orm";

const DEFAULT_CASH = 100_000;
const EARLY_ADOPTER_INFLATED_CASH = 1_000_000;

async function main() {
  console.log("Starting portfolio balance normalization (removing early-adopter advantage)...");

  console.log("Deleting all paper trades...");
  await db.delete(paperTradesTable);
  console.log("Deleted all paper trades.");

  console.log("Deleting all paper positions...");
  await db.delete(paperPositionsTable);
  console.log("Deleted all paper positions.");

  console.log(`Resetting all portfolios with cash_balance >= $${EARLY_ADOPTER_INFLATED_CASH.toLocaleString()} to $${DEFAULT_CASH.toLocaleString()}...`);
  const result = await db
    .update(paperPortfoliosTable)
    .set({ cashBalance: DEFAULT_CASH, updatedAt: new Date() })
    .where(gt(paperPortfoliosTable.cashBalance, DEFAULT_CASH));
  console.log("Portfolio normalization complete.", result);

  console.log("All users now start with the standardized $100,000 balance.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
