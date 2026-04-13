import { db } from "@workspace/db";
import { badgesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const BACKTESTER_BADGE_DEFS = [
  {
    slug: "strategy-scientist",
    name: "Strategy Scientist",
    description: "Ran your first backtested strategy",
    icon: "flask",
    category: "backtester",
    xpReward: 50,
    requirement: "Run 1 backtest",
    threshold: 1,
  },
  {
    slug: "alpha-finder",
    name: "Alpha Finder",
    description: "Backtested a strategy that beat the benchmark (10%+ return, Sharpe > 1.0)",
    icon: "target",
    category: "backtester",
    xpReward: 150,
    requirement: "Beat benchmark with a backtest",
    threshold: 1,
  },
  {
    slug: "ten-bagger",
    name: "10-Bagger",
    description: "Backtested a strategy achieving 100%+ total return",
    icon: "rocket",
    category: "backtester",
    xpReward: 300,
    requirement: "Achieve 100%+ total return in a backtest",
    threshold: 1,
  },
  {
    slug: "quant-veteran",
    name: "Quant Veteran",
    description: "Ran 10 or more backtests — a true quantitative researcher",
    icon: "brain",
    category: "backtester",
    xpReward: 200,
    requirement: "Run 10 backtests",
    threshold: 10,
  },
];

export async function ensureBacktesterBadgesExist(): Promise<void> {
  for (const badge of BACKTESTER_BADGE_DEFS) {
    const [existing] = await db
      .select()
      .from(badgesTable)
      .where(eq(badgesTable.slug, badge.slug));
    if (!existing) {
      await db.insert(badgesTable).values({
        slug: badge.slug,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        category: badge.category,
        xpReward: badge.xpReward,
        requirement: badge.requirement,
        threshold: badge.threshold,
      });
      logger.info({ slug: badge.slug }, "Seeded backtester badge");
    }
  }
}
