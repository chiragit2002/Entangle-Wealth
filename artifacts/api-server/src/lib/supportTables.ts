import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

export async function ensureSupportTables() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        user_email TEXT,
        subject TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'general',
        description TEXT NOT NULL,
        screenshot_url TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        admin_notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        resolved_at TIMESTAMPTZ
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS service_status (
        id SERIAL PRIMARY KEY,
        service_name TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'operational',
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        updated_by TEXT
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS status_incidents (
        id SERIAL PRIMARY KEY,
        service_name TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        severity TEXT NOT NULL DEFAULT 'minor',
        status TEXT NOT NULL DEFAULT 'investigating',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        resolved_at TIMESTAMPTZ
      )
    `);
    await db.execute(sql`
      INSERT INTO service_status (service_name, status) VALUES
        ('API Server', 'operational'),
        ('Market Data', 'operational'),
        ('AI Analysis', 'operational'),
        ('Authentication', 'operational'),
        ('Payments', 'operational')
      ON CONFLICT (service_name) DO NOTHING
    `);
    logger.info("Support tables ensured");
  } catch (err) {
    logger.error(err, "Failed to ensure support tables");
  }
}
