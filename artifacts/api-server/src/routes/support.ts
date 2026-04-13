import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import { imageCompressionMiddleware } from "../middlewares/imageCompression";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { sendZapierWebhook } from "../lib/zapierWebhook";
import { validateBody, validateQuery, validateParams, PaginationQuerySchema, IntIdParamsSchema, z } from "../lib/validateRequest";

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

const TicketCreateSchema = z.object({
  subject: z.string().min(1).max(MAX_SUBJECT_LENGTH),
  category: z.enum(VALID_TICKET_CATEGORIES as [string, ...string[]]),
  description: z.string().min(1).max(MAX_DESCRIPTION_LENGTH),
  screenshotUrl: z.string().max(7_000_000).optional(),
});

const TicketPatchSchema = z.object({
  status: z.enum(VALID_TICKET_STATUSES as [string, ...string[]]).optional(),
  adminNotes: z.string().max(MAX_NOTES_LENGTH).optional(),
});

const ServiceStatusSchema = z.object({
  status: z.enum(["operational", "degraded", "outage"]),
});

const IncidentCreateSchema = z.object({
  serviceName: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  severity: z.enum(["minor", "major", "critical"]).optional().default("minor"),
});

const router = Router();

router.post("/support/tickets", requireAuth, imageCompressionMiddleware, validateBody(TicketCreateSchema), async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  const { subject, category, description, screenshotUrl } = req.body;

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
    }).catch(err => logger.warn({ err, userId, subject, category }, 'Failed to send support_ticket_submitted Zapier webhook'));

    res.json({ success: true, ticketId: ticket.id, createdAt: ticket.created_at });
  } catch (err) {
    logger.error(err, "Failed to create support ticket");
    res.status(500).json({ error: "Failed to create ticket" });
  }
});

router.get("/support/tickets", requireAuth, validateQuery(PaginationQuerySchema), async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  const { limit, offset } = req.query as unknown as { limit: number; offset: number };

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

const AdminTicketsQuerySchema = PaginationQuerySchema.extend({
  status: z.string().max(50).optional(),
});

router.get("/support/admin/tickets", requireAuth, requireAdmin, validateQuery(AdminTicketsQuerySchema), async (req: Request, res: Response) => {
  try {
    const statusFilter = (req.query.status as string) || "";
    const { limit, offset } = req.query as unknown as { limit: number; offset: number };

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

router.patch("/support/admin/tickets/:id", requireAuth, requireAdmin, validateParams(IntIdParamsSchema), validateBody(TicketPatchSchema), async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  const ticketId = req.params.id as unknown as number;
  const { status, adminNotes } = req.body;

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

router.get("/status/services", requireAuth, async (_req: Request, res: Response) => {
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

router.get("/status/incidents", requireAuth, validateQuery(PaginationQuerySchema), async (req: Request, res: Response) => {
  try {
    const { limit, offset } = req.query as unknown as { limit: number; offset: number };
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

const ServiceNameParamsSchema = z.object({
  name: z.string().min(1).max(100),
});

router.patch("/status/admin/services/:name", requireAuth, requireAdmin, validateParams(ServiceNameParamsSchema), validateBody(ServiceStatusSchema), async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  const serviceName = decodeURIComponent(req.params.name);
  const { status } = req.body;

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

router.post("/status/admin/incidents", requireAuth, requireAdmin, validateBody(IncidentCreateSchema), async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  const { serviceName, title, description, severity } = req.body;

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
