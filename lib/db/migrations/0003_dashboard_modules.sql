-- Migration: Add dashboard module columns to users table + audit event table
-- Task #147: Occupation Rules Engine & Dynamic Dashboard
-- Applied: 2026-04-14

ALTER TABLE users ADD COLUMN IF NOT EXISTS dashboard_modules JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dashboard_modules_assigned_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_users_dashboard_modules_assigned_at ON users(dashboard_modules_assigned_at)
  WHERE dashboard_modules_assigned_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS dashboard_module_events (
  id SERIAL PRIMARY KEY,
  clerk_id TEXT NOT NULL,
  occupation_id TEXT NOT NULL,
  is_business_owner BOOLEAN NOT NULL DEFAULT false,
  module_ids JSONB NOT NULL,
  previous_module_ids JSONB,
  changed BOOLEAN NOT NULL DEFAULT false,
  trigger TEXT NOT NULL DEFAULT 'auto',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_module_events_clerk_id ON dashboard_module_events(clerk_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_module_events_created_at ON dashboard_module_events(created_at);
