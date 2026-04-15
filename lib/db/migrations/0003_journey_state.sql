-- Migration: Add journey_state column to users table
-- Task #143: Cohesive Financial Journey Arc
-- Applied: 2026-04-13

ALTER TABLE users ADD COLUMN IF NOT EXISTS journey_state jsonb;
