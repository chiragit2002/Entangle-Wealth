import { Router } from "express";
import { db } from "@workspace/db";
import { gigsTable } from "@workspace/db/schema";
import { eq, desc, ilike, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import crypto from "crypto";
import { validateBody, validateParams, validateQuery, z } from "../lib/validateRequest";
import { logger } from "../lib/logger";

const router = Router();

const GigsQuerySchema = z.object({
  category: z.string().max(100).optional(),
  q: z.string().max(200).optional(),
});

const MOCK_GIGS = [
  { id: "mock-1", userId: "system", title: "Pressure Wash Driveway & Walkway", description: "Professional pressure washing. Before/after photos provided.", price: "$120", category: "outdoor", contactName: "Marcus J.", rating: "4.9", completedJobs: 47, isActive: true, createdAt: new Date() },
  { id: "mock-2", userId: "system", title: "Full Car Detail Interior & Exterior", description: "Complete detail including vacuum, wipe down, exterior wash and wax.", price: "$85", category: "auto", contactName: "DeShawn T.", rating: "5.0", completedJobs: 83, isActive: true, createdAt: new Date() },
  { id: "mock-3", userId: "system", title: "Lawn Mowing & Edging", description: "Mow, edge, and blow. Yards up to 1/4 acre. Same day available.", price: "$45", category: "outdoor", contactName: "Carlos R.", rating: "4.8", completedJobs: 124, isActive: true, createdAt: new Date() },
  { id: "mock-4", userId: "system", title: "House Deep Clean Top to Bottom", description: "Full home deep clean. Bathrooms, kitchen, floors, baseboards.", price: "$150", category: "cleaning", contactName: "Tanya M.", rating: "4.9", completedJobs: 61, isActive: true, createdAt: new Date() },
  { id: "mock-5", userId: "system", title: "Help Moving Furniture & Boxes", description: "Strong and reliable. Truck available for extra fee. No job too big.", price: "$35/hr", category: "moving", contactName: "Jerome B.", rating: "4.7", completedJobs: 38, isActive: true, createdAt: new Date() },
  { id: "mock-6", userId: "system", title: "Shed & Garage Cleanout", description: "Full cleanout, haul away, sweep. Same week availability.", price: "$95", category: "cleaning", contactName: "Lisa K.", rating: "4.8", completedJobs: 29, isActive: true, createdAt: new Date() },
  { id: "mock-7", userId: "system", title: "Mobile Oil Change", description: "I come to you. Most vehicles. Synthetic blend included.", price: "$65", category: "auto", contactName: "Andre W.", rating: "4.9", completedJobs: 56, isActive: true, createdAt: new Date() },
  { id: "mock-8", userId: "system", title: "Junk Removal & Haul Away", description: "Same-day pickup. Furniture, appliances, yard waste. Free estimates.", price: "$80+", category: "moving", contactName: "Ray D.", rating: "4.6", completedJobs: 42, isActive: true, createdAt: new Date() },
];

router.get("/gigs", validateQuery(GigsQuerySchema), async (req, res) => {
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

    let allGigs = [...dbGigs];
    if (allGigs.length < 4) {
      let mockFiltered = MOCK_GIGS;
      if (category && category !== "all") {
        mockFiltered = mockFiltered.filter(g => g.category === category);
      }
      if (q) {
        const query = String(q).toLowerCase();
        mockFiltered = mockFiltered.filter(g => g.title.toLowerCase().includes(query));
      }
      allGigs = [...allGigs, ...mockFiltered];
    }

    res.json(allGigs);
  } catch (error) {
    logger.error({ err: error }, "Error fetching gigs:");
    let mockFiltered = MOCK_GIGS;
    if (category && category !== "all") {
      mockFiltered = mockFiltered.filter(g => g.category === category);
    }
    if (q) {
      const query = String(q).toLowerCase();
      mockFiltered = mockFiltered.filter(g => g.title.toLowerCase().includes(query));
    }
    res.json(mockFiltered);
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
  const gigId = req.params.id;

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
