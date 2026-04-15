import { db } from "@workspace/db";
import { strategyEventsTable, portfolioSnapshotsTable } from "@workspace/db/schema";
import { eq, desc, sql, count } from "drizzle-orm";
import { logger } from "../logger.js";
import { replayPortfolio, getLatestSnapshot } from "./replayEngine.js";
import type { SnapshotState } from "./types.js";

const SNAPSHOT_EVENT_THRESHOLD = 50;
const SNAPSHOT_TIME_THRESHOLD_MS = 30_000;

export async function shouldCreateSnapshot(portfolioId: number): Promise<boolean> {
  const snapshot = await getLatestSnapshot(portfolioId);

  if (!snapshot) {
    const [result] = await db
      .select({ count: count() })
      .from(strategyEventsTable)
      .where(eq(strategyEventsTable.portfolioId, portfolioId));
    return (result?.count ?? 0) > 0;
  }

  const [result] = await db
    .select({ count: count() })
    .from(strategyEventsTable)
    .where(sql`${strategyEventsTable.portfolioId} = ${portfolioId} AND ${strategyEventsTable.id} > ${snapshot.lastEventId}`);

  const eventsSinceSnapshot = result?.count ?? 0;
  if (eventsSinceSnapshot >= SNAPSHOT_EVENT_THRESHOLD) return true;

  const timeSinceSnapshot = Date.now() - snapshot.createdAt.getTime();
  if (timeSinceSnapshot >= SNAPSHOT_TIME_THRESHOLD_MS && eventsSinceSnapshot > 0) return true;

  return false;
}

export async function createSnapshot(portfolioId: number): Promise<void> {
  try {
    const { state, lastEventId } = await replayPortfolio(portfolioId);

    if (lastEventId === 0) return;

    const existing = await getLatestSnapshot(portfolioId);
    if (existing && existing.lastEventId === lastEventId) return;

    const snapshotState: SnapshotState = {
      cashBalance: state.cashBalance,
      positions: state.positions.map((p) => ({
        ticker: p.ticker,
        quantity: p.quantity,
        avgPrice: p.avgPrice,
      })),
    };

    await db.insert(portfolioSnapshotsTable).values({
      portfolioId,
      lastEventId,
      state: snapshotState,
    });

    logger.info({ portfolioId, lastEventId, positionCount: state.positions.length }, "Portfolio snapshot created");
  } catch (err) {
    logger.error({ err, portfolioId }, "Failed to create portfolio snapshot");
  }
}

export async function maybeCreateSnapshot(portfolioId: number): Promise<void> {
  const needed = await shouldCreateSnapshot(portfolioId);
  if (needed) {
    await createSnapshot(portfolioId);
  }
}

export async function rebuildSnapshots(portfolioId: number): Promise<void> {
  logger.warn({ portfolioId }, "Rebuilding all snapshots from scratch");

  await db
    .delete(portfolioSnapshotsTable)
    .where(eq(portfolioSnapshotsTable.portfolioId, portfolioId));

  await createSnapshot(portfolioId);
  logger.info({ portfolioId }, "Snapshot rebuild complete");
}
