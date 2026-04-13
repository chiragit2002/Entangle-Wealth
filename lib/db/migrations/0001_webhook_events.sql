-- Migration: Create webhook_events audit table
-- Task #138: Fix Stripe Webhook — Write Subscription Tier to DB
-- Applied: 2026-04-13

CREATE TABLE IF NOT EXISTS webhook_events (
  id SERIAL PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  stripe_customer_id TEXT,
  user_id TEXT,
  tier_before TEXT,
  tier_after TEXT,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
