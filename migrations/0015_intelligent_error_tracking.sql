-- Migration: Add intelligent error tracking fields
-- This adds support for calculated priority, priority scoring, error grouping, and transient error marking

ALTER TABLE "system_errors" ADD COLUMN IF NOT EXISTS "calculated_priority" text;
ALTER TABLE "system_errors" ADD COLUMN IF NOT EXISTS "priority_score" integer;
ALTER TABLE "system_errors" ADD COLUMN IF NOT EXISTS "group_key" text;
ALTER TABLE "system_errors" ADD COLUMN IF NOT EXISTS "is_transient" boolean DEFAULT false;

-- Add index for group_key to optimize error grouping queries
CREATE INDEX IF NOT EXISTS "system_errors_group_key_idx" ON "system_errors" ("group_key") WHERE "group_key" IS NOT NULL;

-- Add index for calculated_priority to optimize priority-based queries
CREATE INDEX IF NOT EXISTS "system_errors_calculated_priority_idx" ON "system_errors" ("calculated_priority") WHERE "resolved" = false;
