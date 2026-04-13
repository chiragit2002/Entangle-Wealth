import { db } from "@workspace/db";
import { crawlRunsTable } from "@workspace/db/schema";
import { desc } from "drizzle-orm";
import { spawn } from "node:child_process";
import * as path from "node:path";
import * as url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const CRAWL_INTERVAL_MS = 24 * 60 * 60 * 1000;

let schedulerTimer: ReturnType<typeof setTimeout> | null = null;
let isRunning = false;

async function runScheduledCrawl() {
  if (isRunning) return;

  isRunning = true;

  try {
    const [run] = await db.insert(crawlRunsTable).values({
      status: "running",
      triggeredBy: "scheduler",
    }).returning();

    const baseUrl = process.env.CRAWLER_BASE_URL
      || `http://localhost:${process.env.PORT || 3001}`;

    const screenshotsDir = process.env.CRAWLER_SCREENSHOTS_DIR || "/tmp/crawl-screenshots";
    const workspaceRoot = path.resolve(__dirname, "../../../../");

    const child = spawn(
      "pnpm",
      ["--filter", "@workspace/scripts", "run", "crawler"],
      {
        cwd: workspaceRoot,
        env: {
          ...process.env,
          CRAWLER_BASE_URL: baseUrl,
          CRAWLER_SCREENSHOTS_DIR: screenshotsDir,
          CRAWL_RUN_ID: String(run.id),
        },
        detached: false,
        stdio: "pipe",
      }
    );

    child.stdout?.on("data", (data: Buffer) => {
      process.stdout.write(`[CrawlScheduler] ${data}`);
    });
    child.stderr?.on("data", (data: Buffer) => {
      process.stderr.write(`[CrawlScheduler ERR] ${data}`);
    });

    await new Promise<void>((resolve) => {
      child.on("close", () => resolve());
    });
  } catch (err) {
    console.error("[CrawlScheduler] Error during scheduled crawl:", err);
  } finally {
    isRunning = false;
  }
}

function scheduleNext() {
  schedulerTimer = setTimeout(async () => {
    await runScheduledCrawl();
    scheduleNext();
  }, CRAWL_INTERVAL_MS);
}

export function startCrawlScheduler() {
  if (process.env.DISABLE_CRAWL_SCHEDULER === "true") return;
  if (schedulerTimer !== null) return;

  console.log(`[CrawlScheduler] Started — will crawl every 24 hours`);
  scheduleNext();
}

export function stopCrawlScheduler() {
  if (schedulerTimer !== null) {
    clearTimeout(schedulerTimer);
    schedulerTimer = null;
  }
}
