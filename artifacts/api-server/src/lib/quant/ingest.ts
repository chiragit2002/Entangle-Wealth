import { randomUUID } from "crypto";
import { logger } from "../logger";
import type { RawStrategy, NormalizedStrategy } from "./types";

function deriveField(values: (number | undefined)[], fallback: number): number {
  return values.find((v) => v !== undefined && v > 0) ?? fallback;
}

function buildHistory(provided: number[] | undefined, price: number, n = 30): number[] {
  if (provided && provided.length >= 5) return provided;
  const seed: number[] = [];
  let p = price;
  for (let i = 0; i < n; i++) {
    p = p * (1 + (Math.random() - 0.5) * 0.02);
    seed.push(+p.toFixed(4));
  }
  seed.push(price);
  return seed;
}

function validate(raw: RawStrategy): string[] {
  const errors: string[] = [];
  if (!raw.symbol || typeof raw.symbol !== "string") errors.push("missing symbol");
  if (!["buy", "sell", "hold"].includes(raw.action)) errors.push("invalid action");
  if (typeof raw.price !== "number" || raw.price <= 0) errors.push("invalid price");
  return errors;
}

export function ingestStrategy(raw: RawStrategy): NormalizedStrategy | null {
  const errors = validate(raw);
  if (errors.length > 0) {
    logger.warn({ raw, errors }, "[Ingest] Strategy validation failed");
    return null;
  }

  const price = raw.price;
  const priceHistory = buildHistory(raw.priceHistory, price);
  const volumeHistory = buildHistory(raw.volumeHistory, raw.volume ?? 1_000_000);
  const highHistory = buildHistory(raw.highHistory, raw.high ?? price * 1.01);
  const lowHistory = buildHistory(raw.lowHistory, raw.low ?? price * 0.99);

  const normalized: NormalizedStrategy = {
    strategy_id: randomUUID(),
    symbol: raw.symbol.toUpperCase(),
    action: raw.action,
    price,
    rsi: deriveField([raw.rsi], 50),
    macd: deriveField([raw.macd], 0),
    macdSignal: deriveField([raw.macdSignal], 0),
    bollingerUpper: deriveField([raw.bollingerUpper], price * 1.02),
    bollingerLower: deriveField([raw.bollingerLower], price * 0.98),
    volume: deriveField([raw.volume], 1_000_000),
    avgVolume: deriveField([raw.avgVolume], 1_000_000),
    high: deriveField([raw.high], price * 1.01),
    low: deriveField([raw.low], price * 0.99),
    open: deriveField([raw.open], price),
    close: deriveField([raw.close], price),
    priceHistory,
    volumeHistory,
    highHistory,
    lowHistory,
    indicatorTriggers: raw.indicatorTriggers ?? [],
    confidence: raw.confidence ?? 0.5,
    sector: raw.sector ?? "Unknown",
    capTier: raw.capTier ?? "mid",
    sourceAgent: raw.sourceAgent ?? "external",
    ingestedAt: new Date().toISOString(),
  };

  logger.debug({ strategy_id: normalized.strategy_id, symbol: normalized.symbol }, "[Ingest] Strategy normalized");
  return normalized;
}

export function ingestBatch(raws: RawStrategy[]): NormalizedStrategy[] {
  const results: NormalizedStrategy[] = [];
  for (const raw of raws) {
    const n = ingestStrategy(raw);
    if (n) results.push(n);
  }
  logger.info({ total: raws.length, valid: results.length }, "[Ingest] Batch ingestion complete");
  return results;
}
