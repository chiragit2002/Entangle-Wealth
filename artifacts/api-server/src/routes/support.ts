import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

interface AuthenticatedRequest extends Request {
  userId: string;
}

const VALID_TICKET_CATEGORIES = ["general", "trading", "taxflow", "billing", "account", "bug", "feature"];
const VALID_TICKET_STATUSES = ["open", "in_progress", "resolved", "closed"];
const MAX_SUBJECT_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_NOTES_LENGTH = 5000;

const router = Router();

router.post("/support/tickets", requireAuth, async (req: Request, res: Response) => {
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

  if (screenshotUrl && (typeof screenshotUrl !== "string" || screenshotUrl.length > 2000)) {
    return res.status(400).json({ error: "Invalid screenshot URL" });
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

    res.json({ success: true, ticketId: ticket.id, createdAt: ticket.created_at });
  } catch (err) {
    logger.error(err, "Failed to create support ticket");
    res.status(500).json({ error: "Failed to create ticket" });
  }
});

router.get("/support/tickets", requireAuth, async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;

  try {
    const result = await db.execute(sql`
      SELECT id, subject, category, status, created_at, updated_at, resolved_at
      FROM support_tickets
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 50
    `);

    res.json({ tickets: result.rows });
  } catch (err) {
    logger.error(err, "Failed to fetch user tickets");
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

router.get("/support/admin/tickets", requireAuth, async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;

  try {
    const adminUser = await db.select({ subscriptionTier: usersTable.subscriptionTier }).from(usersTable).where(eq(usersTable.clerkId, userId)).limit(1);
    if (!adminUser[0] || adminUser[0].subscriptionTier !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const statusFilter = (req.query.status as string) || "";
    let query = sql`
      SELECT id, user_id, user_email, subject, category, description, screenshot_url, status, admin_notes, created_at, updated_at, resolved_at
      FROM support_tickets
    `;

    if (statusFilter && statusFilter !== "all") {
      query = sql`
        SELECT id, user_id, user_email, subject, category, description, screenshot_url, status, admin_notes, created_at, updated_at, resolved_at
        FROM support_tickets
        WHERE status = ${statusFilter}
      `;
    }

    query = sql`${query} ORDER BY created_at DESC LIMIT 200`;

    const result = await db.execute(query);
    res.json({ tickets: result.rows });
  } catch (err) {
    logger.error(err, "Failed to fetch admin tickets");
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

router.patch("/support/admin/tickets/:id", requireAuth, async (req: Request, res: Response) => {
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
    const adminUser = await db.select({ subscriptionTier: usersTable.subscriptionTier }).from(usersTable).where(eq(usersTable.clerkId, userId)).limit(1);
    if (!adminUser[0] || adminUser[0].subscriptionTier !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

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

router.get("/status/incidents", async (_req: Request, res: Response) => {
  try {
    const result = await db.execute(sql`
      SELECT id, service_name, title, description, severity, status, created_at, resolved_at
      FROM status_incidents
      WHERE created_at > NOW() - INTERVAL '30 days'
      ORDER BY created_at DESC
      LIMIT 50
    `);
    res.json({ incidents: result.rows });
  } catch (err) {
    logger.error(err, "Failed to fetch incidents");
    res.status(500).json({ error: "Failed to fetch incidents" });
  }
});

router.patch("/status/admin/services/:name", requireAuth, async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  const serviceName = decodeURIComponent(req.params.name);
  const { status } = req.body;

  if (!status || !["operational", "degraded", "outage"].includes(status)) {
    return res.status(400).json({ error: "Invalid status. Must be operational, degraded, or outage." });
  }

  try {
    const adminUser = await db.select({ subscriptionTier: usersTable.subscriptionTier }).from(usersTable).where(eq(usersTable.clerkId, userId)).limit(1);
    if (!adminUser[0] || adminUser[0].subscriptionTier !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

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

router.post("/status/admin/incidents", requireAuth, async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  const { serviceName, title, description, severity } = req.body;

  if (!serviceName || !title) {
    return res.status(400).json({ error: "Service name and title are required" });
  }

  try {
    const adminUser = await db.select({ subscriptionTier: usersTable.subscriptionTier }).from(usersTable).where(eq(usersTable.clerkId, userId)).limit(1);
    if (!adminUser[0] || adminUser[0].subscriptionTier !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

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
