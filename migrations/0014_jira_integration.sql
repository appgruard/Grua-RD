-- Jira Integration: Add Jira sync fields to tickets table
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "jira_issue_id" text;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "jira_issue_key" text;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "jira_synced_at" timestamp;

-- Create index for faster Jira lookups
CREATE INDEX IF NOT EXISTS "tickets_jira_issue_key_idx" ON "tickets" ("jira_issue_key") WHERE "jira_issue_key" IS NOT NULL;
