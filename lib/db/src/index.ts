import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const DB_POOL_MAX = parseInt(process.env.DB_POOL_MAX || "20", 10);
const DB_CONNECT_TIMEOUT_MS = parseInt(process.env.DB_CONNECT_TIMEOUT_MS || "5000", 10);
const DB_IDLE_TIMEOUT_MS = parseInt(process.env.DB_IDLE_TIMEOUT_MS || "30000", 10);
const DB_STATEMENT_TIMEOUT_MS = parseInt(process.env.DB_STATEMENT_TIMEOUT_MS || "15000", 10);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: DB_POOL_MAX,
  connectionTimeoutMillis: DB_CONNECT_TIMEOUT_MS,
  idleTimeoutMillis: DB_IDLE_TIMEOUT_MS,
  statement_timeout: DB_STATEMENT_TIMEOUT_MS,
});

interface DbLogger {
  error(obj: Record<string, unknown>, msg: string): void;
  debug(obj: Record<string, unknown>, msg: string): void;
}

declare global {
  // eslint-disable-next-line no-var
  var __dbLogger: DbLogger | undefined;
}

pool.on("error", (err) => {
  const log = globalThis.__dbLogger;
  if (log) {
    log.error({ err: { message: err.message } }, "Unexpected database pool client error");
  } else {
    console.error("[DB POOL ERROR]", err.message);
  }
});

pool.on("connect", () => {
  const log = globalThis.__dbLogger;
  if (log) {
    log.debug(
      { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount },
      "New database connection established"
    );
  }
});

export function getPoolStats() {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
    max: DB_POOL_MAX,
    connectTimeoutMs: DB_CONNECT_TIMEOUT_MS,
    idleTimeoutMs: DB_IDLE_TIMEOUT_MS,
    statementTimeoutMs: DB_STATEMENT_TIMEOUT_MS,
  };
}

export const db = drizzle(pool, { schema });

export * from "./schema";
