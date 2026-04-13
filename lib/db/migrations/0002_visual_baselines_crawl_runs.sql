-- Migration: Create visual_baselines and crawl_runs tables
-- Task #134: Playwright UI Crawler & Visual Regression Testing
-- Applied: 2026-04-13

CREATE TABLE IF NOT EXISTS crawl_runs (
  id SERIAL PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  total_pages INTEGER DEFAULT 0,
  total_issues INTEGER DEFAULT 0,
  total_regressions INTEGER DEFAULT 0,
  triggered_by TEXT DEFAULT 'api',
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_crawl_runs_status ON crawl_runs(status);
CREATE INDEX IF NOT EXISTS idx_crawl_runs_started_at ON crawl_runs(started_at);

CREATE TABLE IF NOT EXISTS visual_baselines (
  id SERIAL PRIMARY KEY,
  page_url TEXT NOT NULL,
  viewport TEXT NOT NULL DEFAULT 'desktop',
  screenshot_path TEXT NOT NULL,
  baseline_path TEXT,
  diff_path TEXT,
  diff_percent REAL DEFAULT 0,
  is_regression BOOLEAN DEFAULT false,
  approved_at TIMESTAMP WITH TIME ZONE,
  is_current BOOLEAN DEFAULT true,
  crawl_run_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visual_baselines_page_url ON visual_baselines(page_url);
CREATE INDEX IF NOT EXISTS idx_visual_baselines_is_current ON visual_baselines(is_current);
CREATE INDEX IF NOT EXISTS idx_visual_baselines_is_regression ON visual_baselines(is_regression);
