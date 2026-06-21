UPDATE "workspace_agent_runs"
SET "status" = 'cancelled',
    "error" = 'App artifact capability removed.',
    "completed_at" = NOW()
WHERE "status" = 'waiting_for_approval'
  AND "id" IN (
    SELECT "run_id"
    FROM "workspace_agent_approvals"
    WHERE "tool_name" IN ('share_learning_app', 'render_interactive_widget')
      AND "status" = 'pending'
  );
--> statement-breakpoint
DELETE FROM "workspace_agent_run_events"
WHERE "label" IN ('share_learning_app', 'render_interactive_widget');
--> statement-breakpoint
DELETE FROM "workspace_agent_approvals"
WHERE "tool_name" IN ('share_learning_app', 'render_interactive_widget');
--> statement-breakpoint
DELETE FROM "workspace_agent_capabilities"
WHERE "kind" = 'internal_tool'
  AND "tool_name" IN ('share_learning_app', 'render_interactive_widget');
--> statement-breakpoint
DELETE FROM "workspace_artifacts"
WHERE "kind" = 'app'
   OR "payload"->>'type' = 'app';
--> statement-breakpoint
DELETE FROM "workspace_messages"
WHERE "artifact"->>'type' = 'app';
--> statement-breakpoint
DROP TABLE "learning_apps" CASCADE;
