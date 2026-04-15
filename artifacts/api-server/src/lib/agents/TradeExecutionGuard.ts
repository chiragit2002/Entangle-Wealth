import crypto from "crypto";
import { db, pool } from "@workspace/db";
import { paperPositionsTable, paperPortfoliosTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "../logger";
import { getLivePrices } from "../priceService";

const EXPOSURE_THRESHOLD = 0.80;
const IDEMPOTENCY_TTL_INTERVAL = "1 hour";

let tableInitialized = false;

async function ensureIdempotencyTable(): Promise<void> {
  if (tableInitialized) return;
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS trade_execution_idempotency_keys (
        key TEXT PRIMARY KEY,
        strategy_id TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_idempotency_keys_created_at
      ON trade_execution_idempotency_keys (created_at)
    `);
    tableInitialized = true;
  } finally {
    client.release();
  }
}

async function pruneExpiredIdempotencyKeys(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(
      `DELETE FROM trade_execution_idempotency_keys WHERE created_at < NOW() - INTERVAL '${IDEMPOTENCY_TTL_INTERVAL}'`,
    );
  } catch (err) {
    logger.warn({ err }, "[TradeExecutionGuard] Failed to prune expired idempotency keys (non-fatal)");
  } finally {
    client.release();
  }
}

export function generateIdempotencyKey(executionId: string, timestamp: number): string {
  if (timestamp === 0) {
    return crypto.createHash("sha256").update(executionId).digest("hex");
  }
  return crypto.createHash("sha256").update(`${executionId}:${timestamp}`).digest("hex");
}

export interface IdempotencyGuardResult {
  allowed: boolean;
  key: string;
  reason?: string;
}

export async function checkAndMarkIdempotency(executionId: string, timestamp: number): Promise<IdempotencyGuardResult> {
  const key = generateIdempotencyKey(executionId, timestamp);

  try {
    await ensureIdempotencyTable();

    const client = await pool.connect();
    try {
      const result = await client.query<{ key: string }>(
        `INSERT INTO trade_execution_idempotency_keys (key, strategy_id)
         VALUES ($1, $2)
         ON CONFLICT (key) DO NOTHING
         RETURNING key`,
        [key, executionId],
      );

      if (result.rows.length === 0) {
        logger.warn({ executionId, key }, "[TradeExecutionGuard] Idempotency rejection: already processed");
        logGuardActivation("idempotency_rejection", executionId, {
          key,
          executionId,
          reason: "already processed",
        }).catch(() => {});
        return { allowed: false, key, reason: "already processed" };
      }

      pruneExpiredIdempotencyKeys().catch(() => {});

      return { allowed: true, key };
    } finally {
      client.release();
    }
  } catch (err) {
    logger.warn({ err, executionId, key }, "[TradeExecutionGuard] Idempotency DB operation failed — allowing execution (fail-open)");
    return { allowed: true, key };
  }
}

export interface PositionGuardResult {
  allowed: boolean;
  reason?: string;
  existingQuantity?: number;
}

export async function checkPositionDedup(
  userId: string,
  symbol: string,
  side: "buy" | "sell" | "short_sell" | "short_cover",
): Promise<PositionGuardResult> {
  if (side !== "buy" && side !== "short_sell") {
    return { allowed: true };
  }

  const [existingPos] = await db
    .select()
    .from(paperPositionsTable)
    .where(and(eq(paperPositionsTable.userId, userId), eq(paperPositionsTable.symbol, symbol)));

  if (!existingPos) {
    return { allowed: true };
  }

  if (existingPos.quantity !== 0) {
    logger.info(
      { userId, symbol, existingQuantity: existingPos.quantity, side },
      "[TradeExecutionGuard] Position dedup: symbol already held — new position open skipped",
    );
    logGuardActivation("position_skip", userId, {
      symbol,
      side,
      existingQuantity: existingPos.quantity,
      reason: "already in position",
    }).catch(() => {});
    return { allowed: false, reason: "already in position", existingQuantity: existingPos.quantity };
  }

  return { allowed: true };
}

export interface ExposureGuardResult {
  allowed: boolean;
  exposurePct?: number;
  reason?: string;
}

export async function checkExposureBreaker(
  userId: string,
  side: "buy" | "sell" | "short_sell" | "short_cover",
): Promise<ExposureGuardResult> {
  if (side !== "buy" && side !== "short_sell") {
    return { allowed: true };
  }

  const [portfolio] = await db
    .select()
    .from(paperPortfoliosTable)
    .where(eq(paperPortfoliosTable.userId, userId));

  if (!portfolio) {
    return { allowed: true };
  }

  const positions = await db
    .select()
    .from(paperPositionsTable)
    .where(eq(paperPositionsTable.userId, userId));

  const activePositions = positions.filter(p => p.quantity !== 0);

  if (activePositions.length === 0) {
    return { allowed: true, exposurePct: 0 };
  }

  const symbols = [...new Set(activePositions.map(p => p.symbol))];
  let livePrices: Record<string, number> = {};
  try {
    livePrices = await getLivePrices(symbols);
  } catch (err) {
    logger.warn({ err }, "[TradeExecutionGuard] Failed to fetch live prices for exposure calc — falling back to avg cost");
  }

  const positionsValue = activePositions.reduce((sum, pos) => {
    const price = livePrices[pos.symbol] ?? pos.avgCost;
    return sum + Math.abs(pos.quantity) * price;
  }, 0);

  const totalPortfolioValue = portfolio.cashBalance + positionsValue;

  if (totalPortfolioValue <= 0) {
    return { allowed: true, exposurePct: 0 };
  }

  const exposurePct = positionsValue / totalPortfolioValue;

  if (exposurePct >= EXPOSURE_THRESHOLD) {
    const exposureFormatted = (exposurePct * 100).toFixed(1);
    logger.warn(
      { userId, exposurePct: exposureFormatted, threshold: `${EXPOSURE_THRESHOLD * 100}%` },
      "[TradeExecutionGuard] Exposure circuit breaker triggered — blocking new position open",
    );
    logGuardActivation("exposure_block", userId, {
      exposurePct,
      exposurePctFormatted: `${exposureFormatted}%`,
      positionsValue,
      cashBalance: portfolio.cashBalance,
      totalPortfolioValue,
      reason: `Portfolio exposure ${exposureFormatted}% exceeds 80% limit`,
    }).catch(() => {});
    return {
      allowed: false,
      exposurePct,
      reason: `Portfolio exposure ${exposureFormatted}% exceeds 80% limit`,
    };
  }

  return { allowed: true, exposurePct };
}

async function logGuardActivation(
  guardType: string,
  context: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  try {
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO agent_logs (agent_name, action, status, message, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          "TradeExecutionGuard",
          guardType,
          "warn",
          `Guard activated: ${guardType} for ${context}`,
          JSON.stringify(metadata),
        ],
      );
    } finally {
      client.release();
    }
  } catch (err) {
    logger.warn({ err, guardType, context }, "[TradeExecutionGuard] Failed to write guard activation to audit trail (non-fatal)");
  }
}
