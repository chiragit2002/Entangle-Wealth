import { Router } from "express";
import { db } from "@workspace/db";
import { gigsTable } from "@workspace/db/schema";
import { eq, desc, ilike, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import crypto from "crypto";
import { validateBody, validateParams, validateQuery, z } from "../lib/validateRequest";
import { logger } from "../lib/logger";
import { BoundedRateLimitMap } from "../lib/boundedMap";

const router = Router();

const PUBLIC_RATE_LIMIT_WINDOW_MS = 60_000;
const PUBLIC_RATE_LIMIT_MAX = 30;
const publicRateLimitMap = new BoundedRateLimitMap(5_000, "gigs-rateLimit");

function checkPublicRateLimit(req: import("express").Request): boolean {
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
  const now = Date.now();
  let entry = publicRateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + PUBLIC_RATE_LIMIT_WINDOW_MS };
    publicRateLimitMap.set(ip, entry);
    return true;
  }
  entry.count++;
  return entry.count <= PUBLIC_RATE_LIMIT_MAX;
}

const GigsQuerySchema = z.object({
  category: z.string().max(100).optional(),
  q: z.string().max(200).optional(),
});

router.get("/gigs", validateQuery(GigsQuerySchema), async (req, res) => {
  if (!checkPublicRateLimit(req)) {
    res.status(429).json({ error: "Too many requests. Please slow down." });
    return;
  }
  const { category, q } = req.query;
  try {
    const conditions = [eq(gigsTable.isActive, true)];
    if (category && category !== "all") {
      conditions.push(eq(gigsTable.category, String(category)));
    }
    if (q) {
      conditions.push(ilike(gigsTable.title, `%${String(q)}%`));
    }

    const dbGigs = await db.select().from(gigsTable)
      .where(and(...conditions))
      .orderBy(desc(gigsTable.createdAt))
      .limit(50);

    res.json(dbGigs);
  } catch (error) {
    logger.error({ err: error }, "Error fetching gigs:");
    res.status(500).json({ error: "Failed to fetch gigs" });
  }
});

const GigCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  price: z.string().min(1).max(50),
  category: z.enum(["cleaning", "outdoor", "auto", "moving", "other"]),
  contactName: z.string().max(100).optional(),
});

router.post("/gigs", requireAuth, validateBody(GigCreateSchema), async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const { title, description, price, category, contactName } = req.body;

  try {
    const [gig] = await db.insert(gigsTable).values({
      id: crypto.randomUUID(),
      userId,
      title: String(title).slice(0, 200),
      description: String(description).slice(0, 1000),
      price: String(price).slice(0, 50),
      category,
      contactName: contactName ? String(contactName).slice(0, 100) : null,
    }).returning();

    res.status(201).json(gig);
  } catch (error) {
    logger.error({ err: error }, "Error creating gig:");
    res.status(500).json({ error: "Failed to create gig" });
  }
});

const GigIdParamsSchema = z.object({
  id: z.string().min(1).max(100),
});

router.delete("/gigs/:id", requireAuth, validateParams(GigIdParamsSchema), async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const gigId = req.params.id as string;

  try {
    const [updated] = await db
      .update(gigsTable)
      .set({ isActive: false })
      .where(and(eq(gigsTable.id, gigId), eq(gigsTable.userId, userId)))
      .returning({ id: gigsTable.id });

    if (!updated) {
      res.status(404).json({ error: "Gig not found or not authorized" });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "Error deleting gig:");
    res.status(500).json({ error: "Failed to delete gig" });
  }
});

export default router;
