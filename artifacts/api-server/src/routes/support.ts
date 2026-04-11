import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import { imageCompressionMiddleware } from "../middlewares/imageCompression";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { sendZapierWebhook } from "../lib/zapierWebhook";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";

async function ensureSupportTables() {
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

ensureSupportTables();

const VALID_TICKET_CATEGORIES = ["general", "trading", "taxflow", "billing", "account", "bug", "feature"];
const VALID_TICKET_STATUSES = ["open", "in_progress", "resolved", "closed"];
const MAX_SUBJECT_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_NOTES_LENGTH = 5000;

const router = Router();

router.post("/support/tickets", requireAuth, imageCompressionMiddleware, async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  const { subject, category, description, screenshotUrl } = req.body;

  if (!subject || !category || !description) {
    return res.status(400).json({ error: "Subject, category, and description are required" });
  }

  if (typeof subject !== "string" || subject.length > MAX_SUBJECT_LENGTH) {
    return res.status(400).json({ error: `Subject must be ${MAX_SUBJECT_LENGTH} characters or fewer` });
  }

  if (typeof description !== "string" || description.length > MAX_DESCRIPTION_LENGTH) {
    return res.status(400).json({ error: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer` });
  }

  if (!VALID_TICKET_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: "Invalid category" });
  }

  if (screenshotUrl && (typeof screenshotUrl !== "string" || screenshotUrl.length > 7_000_000)) {
    return res.status(400).json({ error: "Screenshot too large" });
  }

  try {
    const users = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.clerkId, userId)).limit(1);
    const userEmail = users[0]?.email || "";

    const result = await db.execute(sql`
      INSERT INTO support_tickets (user_id, user_email, subject, category, description, screenshot_url)
      VALUES (${userId}, ${userEmail}, ${subject}, ${category}, ${description}, ${screenshotUrl || null})
      RETURNING id, created_at
    `);

    const ticket = result.rows[0];
    logger.info({ ticketId: ticket.id, userId }, "Support ticket created");

    sendZapierWebhook("support_ticket_submitted", {
      userId,
      subject,
      category,
    }).catch((err) => logger.warn({ err }, "Failed to send Zapier webhook for support ticket submitted"));

    res.json({ success: true, ticketId: ticket.id, createdAt: ticket.created_at });
  } catch (err) {
    logger.error(err, "Failed to create support ticket");
    res.status(500).json({ error: "Failed to create ticket" });
  }
});

router.get("/support/tickets", requireAuth, async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 50);
  const offset = parseInt(req.query.offset as string) || 0;

  try {
    const result = await db.execute(sql`
      SELECT id, subject, category, status, created_at, updated_at, resolved_at
      FROM support_tickets
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const totalResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM support_tickets WHERE user_id = ${userId}
    `);
    const total = parseInt(totalResult.rows[0]?.count as string, 10) || 0;

    res.json({ tickets: result.rows, total, limit, offset });
  } catch (err) {
    logger.error(err, "Failed to fetch user tickets");
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

router.get("/support/admin/tickets", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const statusFilter = (req.query.status as string) || "";
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 50);
    const offset = parseInt(req.query.offset as string) || 0;

    let result;
    let totalResult;

    if (statusFilter && statusFilter !== "all") {
      result = await db.execute(sql`
        SELECT id, user_id, user_email, subject, category, description, screenshot_url, status, admin_notes, created_at, updated_at, resolved_at
        FROM support_tickets
        WHERE status = ${statusFilter}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
      totalResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM support_tickets WHERE status = ${statusFilter}
      `);
    } else {
      result = await db.execute(sql`
        SELECT id, user_id, user_email, subject, category, description, screenshot_url, status, admin_notes, created_at, updated_at, resolved_at
        FROM support_tickets
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
      totalResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM support_tickets
      `);
    }

    const total = parseInt(totalResult.rows[0]?.count as string, 10) || 0;
    res.json({ tickets: result.rows, total, limit, offset });
  } catch (err) {
    logger.error(err, "Failed to fetch admin tickets");
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

router.patch("/support/admin/tickets/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  const ticketId = parseInt(req.params.id, 10);
  const { status, adminNotes } = req.body;

  if (isNaN(ticketId)) {
    return res.status(400).json({ error: "Invalid ticket ID" });
  }

  if (status && !VALID_TICKET_STATUSES.includes(status)) {
    return res.status(400).json({ error: "Invalid status. Must be: " + VALID_TICKET_STATUSES.join(", ") });
  }

  if (adminNotes && (typeof adminNotes !== "string" || adminNotes.length > MAX_NOTES_LENGTH)) {
    return res.status(400).json({ error: `Notes must be ${MAX_NOTES_LENGTH} characters or fewer` });
  }

  try {

    const resolvedAt = status === "resolved" || status === "closed" ? sql`NOW()` : sql`resolved_at`;

    await db.execute(sql`
      UPDATE support_tickets
      SET status = COALESCE(${status || null}, status),
          admin_notes = COALESCE(${adminNotes || null}, admin_notes),
          updated_at = NOW(),
          resolved_at = ${resolvedAt}
      WHERE id = ${ticketId}
    `);

    logger.info({ ticketId, status, userId }, "Support ticket updated by admin");
    res.json({ success: true });
  } catch (err) {
    logger.error(err, "Failed to update ticket");
    res.status(500).json({ error: "Failed to update ticket" });
  }
});

router.get("/status/services", async (_req: Request, res: Response) => {
  try {
    const result = await db.execute(sql`
      SELECT service_name, status, updated_at
      FROM service_status
      ORDER BY id
    `);
    res.json({ services: result.rows });
  } catch (err) {
    logger.error(err, "Failed to fetch service status");
    res.status(500).json({ error: "Failed to fetch status" });
  }
});

router.get("/status/incidents", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Math.max(parseInt(String(req.query.limit)) || 50, 1), 50);
    const offset = Math.max(parseInt(String(req.query.offset)) || 0, 0);
    const result = await db.execute(sql`
      SELECT id, service_name, title, description, severity, status, created_at, resolved_at
      FROM status_incidents
      WHERE created_at > NOW() - INTERVAL '30 days'
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
    res.json({ incidents: result.rows });
  } catch (err) {
    logger.error(err, "Failed to fetch incidents");
    res.status(500).json({ error: "Failed to fetch incidents" });
  }
});

router.patch("/status/admin/services/:name", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  const serviceName = decodeURIComponent(req.params.name);
  const { status } = req.body;

  if (!status || !["operational", "degraded", "outage"].includes(status)) {
    return res.status(400).json({ error: "Invalid status. Must be operational, degraded, or outage." });
  }

  try {

    await db.execute(sql`
      UPDATE service_status
      SET status = ${status}, updated_at = NOW(), updated_by = ${userId}
      WHERE service_name = ${serviceName}
    `);

    logger.info({ serviceName, status, userId }, "Service status updated by admin");
    res.json({ success: true });
  } catch (err) {
    logger.error(err, "Failed to update service status");
    res.status(500).json({ error: "Failed to update status" });
  }
});

router.post("/status/admin/incidents", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  const { serviceName, title, description, severity } = req.body;

  if (!serviceName || !title) {
    return res.status(400).json({ error: "Service name and title are required" });
  }

  try {

    const result = await db.execute(sql`
      INSERT INTO status_incidents (service_name, title, description, severity)
      VALUES (${serviceName}, ${title}, ${description || null}, ${severity || "minor"})
      RETURNING id
    `);

    logger.info({ incidentId: result.rows[0].id, serviceName, userId }, "Incident created");
    res.json({ success: true, incidentId: result.rows[0].id });
  } catch (err) {
    logger.error(err, "Failed to create incident");
    res.status(500).json({ error: "Failed to create incident" });
  }
});

export default router;
