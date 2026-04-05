import { Router } from "express";
import { db } from "@workspace/db";
import { savedJobsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.get("/jobs/search", async (req, res) => {
  const { q, location, type, remote, page } = req.query;
  const pageNum = parseInt(page as string) || 1;

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
      const mockJobs = generateMockJobs(query, locationStr, pageNum);
      res.json(mockJobs);
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
      const mockJobs = generateMockJobs(query, locationStr, pageNum);
      res.json(mockJobs);
      return;
    }

    const data = await response.json();
    const jobs = (data.data || []).map((job: any) => ({
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
      disclaimer: "Job listings sourced from third-party providers. Verify details before applying.",
    });
  } catch (error) {
    console.error("Job search error:", error);
    const mockJobs = generateMockJobs((q as string) || "developer", (location as string) || "", pageNum);
    res.json(mockJobs);
  }
});

function generateMockJobs(query: string, location: string, page: number) {
  const companies = [
    "TechFlow Inc.", "DataBridge Corp", "CloudNine Solutions", "Nexus Digital",
    "Apex Analytics", "Quantum Labs", "Vertex Systems", "Pulse Technologies",
    "Synergy AI", "Cascade Networks", "Horizon Software", "Summit Platforms",
    "Forge Technologies", "Atlas Computing", "Pioneer Data Systems",
    "DigitalCraft", "ByteWave", "CoreStack", "MetaLogic", "NanoTech Solutions",
  ];

  const titles = [
    `Senior ${query}`, `${query} Lead`, `Junior ${query}`, `${query} Engineer`,
    `${query} Analyst`, `Staff ${query}`, `Principal ${query}`, `${query} Architect`,
    `${query} Manager`, `Associate ${query}`,
  ];

  const locations = location
    ? [location, `${location} (Remote)`, `${location} (Hybrid)`]
    : ["New York, NY", "San Francisco, CA", "Austin, TX", "Remote", "Chicago, IL", "Seattle, WA", "Denver, CO", "Boston, MA", "Miami, FL", "Portland, OR"];

  const types = ["Full-time", "Part-time", "Contract", "Freelance", "Gig"];

  const jobs = Array.from({ length: 10 }, (_, i) => {
    const idx = (page - 1) * 10 + i;
    const seed = idx * 7919;
    return {
      id: `mock-${idx}-${seed}`,
      title: titles[idx % titles.length],
      company: companies[idx % companies.length],
      location: locations[idx % locations.length],
      salary: `$${60 + (seed % 120)}K - $${100 + (seed % 150)}K`,
      jobType: types[idx % types.length],
      description: `We are looking for a talented ${query} to join our team. You will work on cutting-edge projects, collaborate with cross-functional teams, and help drive innovation. This is a great opportunity for someone passionate about technology and making an impact.`,
      applyUrl: null,
      postedDate: new Date(Date.now() - (idx * 86400000)).toISOString(),
      source: "EntangleWealth Jobs",
      companyLogo: null,
      isRemote: idx % 3 === 0,
    };
  });

  return {
    jobs,
    page,
    hasMore: page < 5,
    disclaimer: "Demo job listings shown. Connect a job search API for real-time results.",
  };
}

router.get("/jobs/saved", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  try {
    const saved = await db.select().from(savedJobsTable).where(eq(savedJobsTable.userId, userId));
    res.json(saved);
  } catch (error) {
    console.error("Error fetching saved jobs:", error);
    res.status(500).json({ error: "Failed to fetch saved jobs" });
  }
});

router.post("/jobs/save", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
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
    console.error("Error saving job:", error);
    res.status(500).json({ error: "Failed to save job" });
  }
});

router.delete("/jobs/saved/:id", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const jobId = parseInt(req.params.id);

  try {
    await db.delete(savedJobsTable)
      .where(and(eq(savedJobsTable.id, jobId), eq(savedJobsTable.userId, userId)));
    res.json({ success: true });
  } catch (error) {
    console.error("Error removing saved job:", error);
    res.status(500).json({ error: "Failed to remove saved job" });
  }
});

export default router;
