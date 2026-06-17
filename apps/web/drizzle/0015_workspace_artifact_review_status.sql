ALTER TABLE "workspace_artifacts" ADD COLUMN "review_status" text DEFAULT 'reviewed' NOT NULL;
--> statement-breakpoint
UPDATE "workspace_artifacts"
SET "review_status" = CASE
  WHEN "kind" IN ('course', 'saved_artifact', 'task_result') THEN 'needs_review'
  ELSE 'reviewed'
END;
