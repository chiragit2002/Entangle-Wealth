import { Router } from "express";
import { PUBLIC_ENDPOINT_POLICY } from "../lib/publicEndpointPolicy";
import { db } from "@workspace/db";
import { resumesTable, resumeExperiencesTable, resumeEducationTable, usersTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import { validateBody, validateParams, IntIdParamsSchema, z } from "../lib/validateRequest";
import { logger } from "../lib/logger";

const router = Router();

router.get("/resumes", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const resumes = await db.select().from(resumesTable).where(eq(resumesTable.userId, userId));
    res.json(resumes);
  } catch (error) {
    logger.error({ err: error }, "Error fetching resumes:");
    res.status(500).json({ error: "Failed to fetch resumes" });
  }
});

const ExperienceSchema = z.object({
  company: z.string().max(200).optional(),
  title: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
  startDate: z.string().max(50).optional(),
  endDate: z.string().max(50).optional(),
  isCurrent: z.boolean().optional(),
  description: z.string().max(2000).optional(),
  isGigWork: z.boolean().optional(),
});

const EducationSchema = z.object({
  institution: z.string().max(200).optional(),
  degree: z.string().max(200).optional(),
  field: z.string().max(200).optional(),
  startDate: z.string().max(50).optional(),
  endDate: z.string().max(50).optional(),
});

const ResumeCreateSchema = z.object({
  title: z.string().max(200).optional(),
  template: z.string().max(100).optional(),
  summary: z.string().max(2000).optional(),
  skills: z.array(z.string().max(100)).max(100).optional(),
  certifications: z.array(z.string().max(200)).max(50).optional(),
});

const ResumeUpdateSchema = ResumeCreateSchema.extend({
  experiences: z.array(ExperienceSchema).max(50).optional(),
  education: z.array(EducationSchema).max(20).optional(),
});

router.post("/resumes", requireAuth, validateBody(ResumeCreateSchema), async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const { title, template, summary, skills, certifications } = req.body;

  try {
    const [resume] = await db.insert(resumesTable).values({
      userId,
      title: title || "My Résumé",
      template: template || "professional",
      summary,
      skills: skills || [],
      certifications: certifications || [],
    }).returning();
    res.json(resume);
  } catch (error) {
    logger.error({ err: error }, "Error creating resume:");
    res.status(500).json({ error: "Failed to create resume" });
  }
});

router.get("/resumes/:id", requireAuth, validateParams(IntIdParamsSchema), async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const resumeId = req.params.id as unknown as number;

  try {
    const [resume] = await db.select().from(resumesTable)
      .where(and(eq(resumesTable.id, resumeId), eq(resumesTable.userId, userId)));

    if (!resume) {
      res.status(404).json({ error: "Résumé not found" });
      return;
    }

    const experiences = await db.select().from(resumeExperiencesTable)
      .where(eq(resumeExperiencesTable.resumeId, resumeId));

    const education = await db.select().from(resumeEducationTable)
      .where(eq(resumeEducationTable.resumeId, resumeId));

    res.json({ ...resume, experiences, education });
  } catch (error) {
    logger.error({ err: error }, "Error fetching resume:");
    res.status(500).json({ error: "Failed to fetch resume" });
  }
});

router.put("/resumes/:id", requireAuth, validateParams(IntIdParamsSchema), validateBody(ResumeUpdateSchema), async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const resumeId = req.params.id as unknown as number;
  const { title, template, summary, skills, certifications, experiences, education } = req.body;

  try {
    const [resume] = await db.select().from(resumesTable)
      .where(and(eq(resumesTable.id, resumeId), eq(resumesTable.userId, userId)));

    if (!resume) {
      res.status(404).json({ error: "Résumé not found" });
      return;
    }

    const [updated] = await db.update(resumesTable).set({
      title, template, summary, skills, certifications, updatedAt: new Date(),
    }).where(eq(resumesTable.id, resumeId)).returning();

    if (experiences) {
      await db.delete(resumeExperiencesTable).where(eq(resumeExperiencesTable.resumeId, resumeId));
      if (experiences.length > 0) {
        await db.insert(resumeExperiencesTable).values(
          experiences.map((exp: any, i: number) => ({
            resumeId,
            company: exp.company,
            title: exp.title,
            location: exp.location,
            startDate: exp.startDate,
            endDate: exp.endDate,
            isCurrent: exp.isCurrent ? "true" : "false",
            description: exp.description,
            isGigWork: exp.isGigWork ? "true" : "false",
            sortOrder: i,
          }))
        );
      }
    }

    if (education) {
      await db.delete(resumeEducationTable).where(eq(resumeEducationTable.resumeId, resumeId));
      if (education.length > 0) {
        await db.insert(resumeEducationTable).values(
          education.map((edu: any, i: number) => ({
            resumeId,
            school: edu.school,
            degree: edu.degree,
            field: edu.field,
            startDate: edu.startDate,
            endDate: edu.endDate,
            sortOrder: i,
          }))
        );
      }
    }

    const updatedExperiences = await db.select().from(resumeExperiencesTable)
      .where(eq(resumeExperiencesTable.resumeId, resumeId));
    const updatedEducation = await db.select().from(resumeEducationTable)
      .where(eq(resumeEducationTable.resumeId, resumeId));

    res.json({ ...updated, experiences: updatedExperiences, education: updatedEducation });
  } catch (error) {
    logger.error({ err: error }, "Error updating resume:");
    res.status(500).json({ error: "Failed to update resume" });
  }
});

router.delete("/resumes/:id", requireAuth, validateParams(IntIdParamsSchema), async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const resumeId = req.params.id as unknown as number;

  try {
    const [resume] = await db.select().from(resumesTable)
      .where(and(eq(resumesTable.id, resumeId), eq(resumesTable.userId, userId)));

    if (!resume) {
      res.status(404).json({ error: "Résumé not found" });
      return;
    }

    await db.delete(resumesTable).where(eq(resumesTable.id, resumeId));
    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "Error deleting resume:");
    res.status(500).json({ error: "Failed to delete resume" });
  }
});

const PublicUserIdParamsSchema = z.object({
  userId: z.string().min(1).max(100),
});

// Public endpoint — approved in publicEndpointPolicy.ts (PUBLIC_ENDPOINT_POLICY[3]).
// Only serves resume data when usersTable.isPublicProfile=true (opt-in).
// Returns 404 for both non-existent and private profiles to prevent enumeration.
void PUBLIC_ENDPOINT_POLICY[3];
router.get("/resumes/public/:userId", validateParams(PublicUserIdParamsSchema), async (req, res) => {
  try {
    const [user] = await db
      .select({ isPublicProfile: usersTable.isPublicProfile })
      .from(usersTable)
      .where(eq(usersTable.id, req.params.userId));

    if (!user || !user.isPublicProfile) {
      res.status(404).json({ error: "Resume not found" });
      return;
    }

    const resumes = await db.select().from(resumesTable)
      .where(eq(resumesTable.userId, req.params.userId));

    if (resumes.length === 0) {
      res.status(404).json({ error: "Resume not found" });
      return;
    }

    const resume = resumes[0];
    const experiences = await db.select().from(resumeExperiencesTable)
      .where(eq(resumeExperiencesTable.resumeId, resume.id));
    const education = await db.select().from(resumeEducationTable)
      .where(eq(resumeEducationTable.resumeId, resume.id));

    res.json({ ...resume, experiences, education });
  } catch (error) {
    logger.error({ err: error }, "Error fetching public resume");
    res.status(500).json({ error: "Failed to fetch resume" });
  }
});

export default router;
