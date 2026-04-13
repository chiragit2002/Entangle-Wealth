import { Router } from "express";
import { db } from "@workspace/db";
import { savedJobsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import { validateBody, validateQuery, validateParams, IntIdParamsSchema, z } from "../lib/validateRequest";
import { logger } from "../lib/logger";

interface JSearchJob {
  job_id?: string;
  job_title?: string;
  employer_name?: string;
  employer_logo?: string;
  job_city?: string;
  job_state?: string;
  job_country?: string;
  job_min_salary?: number;
  job_max_salary?: number;
  job_employment_type?: string;
  job_description?: string;
  job_apply_link?: string;
  job_posted_at_datetime_utc?: string;
  job_publisher?: string;
  job_is_remote?: boolean;
}

const router = Router();

const JobsSearchQuerySchema = z.object({
  q: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
  type: z.string().max(100).optional(),
  remote: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
});

router.get("/jobs/search", requireAuth, validateQuery(JobsSearchQuerySchema), async (req, res) => {
  const { q, location, type, remote } = req.query;
  const { page: pageNum } = req.query as unknown as { page: number };

  try {
    const query = (q as string) || "software developer";
    const locationStr = (location as string) || "";
    const remoteOnly = remote === "true";

    const params = new URLSearchParams({
      query: query + (locationStr ? ` in ${locationStr}` : ""),
      page: String(pageNum),
      num_pages: "1",
      date_posted: "month",
    });

    if (type) params.set("employment_types", type as string);
    if (remoteOnly) params.set("remote_jobs_only", "true");

    const apiKey = process.env.JSEARCH_API_KEY || process.env.RAPIDAPI_KEY;

    if (!apiKey) {
      res.json({ jobs: [], page: pageNum, hasMore: false });
      return;
    }

    const response = await fetch(
      `https://jsearch.p.rapidapi.com/search?${params.toString()}`,
      {
        headers: {
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        },
      }
    );

    if (!response.ok) {
      res.json({ jobs: [], page: pageNum, hasMore: false });
      return;
    }

    const data = await response.json() as { data?: JSearchJob[] };
    const jobs = (data.data || []).map((job: JSearchJob) => ({
      id: job.job_id,
      title: job.job_title,
      company: job.employer_name,
      location: job.job_city ? `${job.job_city}, ${job.job_state || job.job_country}` : job.job_country || "Remote",
      salary: job.job_min_salary && job.job_max_salary
        ? `$${job.job_min_salary.toLocaleString()} - $${job.job_max_salary.toLocaleString()}`
        : null,
      jobType: job.job_employment_type || "Full-time",
      description: job.job_description?.slice(0, 500) || "",
      applyUrl: job.job_apply_link,
      postedDate: job.job_posted_at_datetime_utc,
      source: job.job_publisher || "JSearch",
      companyLogo: job.employer_logo,
      isRemote: job.job_is_remote,
    }));

    res.json({
      jobs,
      page: pageNum,
      hasMore: jobs.length >= 10,
    });
  } catch (error) {
    logger.error({ err: error }, "Job search error:");
    res.json({ jobs: [], page: pageNum, hasMore: false });
  }
});

router.get("/jobs/saved", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const saved = await db.select().from(savedJobsTable).where(eq(savedJobsTable.userId, userId));
    res.json(saved);
  } catch (error) {
    logger.error({ err: error }, "Error fetching saved jobs:");
    res.status(500).json({ error: "Failed to fetch saved jobs" });
  }
});

const SaveJobSchema = z.object({
  jobTitle: z.string().max(300).optional(),
  company: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
  salary: z.string().max(100).optional(),
  jobType: z.string().max(100).optional(),
  sourceUrl: z.string().url().max(1000).optional().or(z.literal("")),
  source: z.string().max(100).optional(),
  externalId: z.string().max(200).optional(),
});

router.post("/jobs/save", requireAuth, validateBody(SaveJobSchema), async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const { jobTitle, company, location, salary, jobType, sourceUrl, source, externalId } = req.body;

  try {
    if (externalId) {
      const [existing] = await db.select().from(savedJobsTable)
        .where(and(eq(savedJobsTable.userId, userId), eq(savedJobsTable.externalId, externalId)));
      if (existing) {
        res.json({ saved: true, alreadySaved: true });
        return;
      }
    }

    await db.insert(savedJobsTable).values({
      userId,
      jobTitle,
      company,
      location,
      salary,
      jobType,
      sourceUrl,
      source,
      externalId,
    });
    res.json({ saved: true });
  } catch (error) {
    logger.error({ err: error }, "Error saving job:");
    res.status(500).json({ error: "Failed to save job" });
  }
});

router.delete("/jobs/saved/:id", requireAuth, validateParams(IntIdParamsSchema), async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const jobId = req.params.id as unknown as number;

  try {
    await db.delete(savedJobsTable)
      .where(and(eq(savedJobsTable.id, jobId), eq(savedJobsTable.userId, userId)));
    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "Error removing saved job:");
    res.status(500).json({ error: "Failed to remove saved job" });
  }
});

export default router;
