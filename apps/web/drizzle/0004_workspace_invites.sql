ALTER TABLE "workspaces" ADD COLUMN "invite_code" text;
--> statement-breakpoint
CREATE UNIQUE INDEX "workspaces_invite_code_idx" ON "workspaces" USING btree ("invite_code");
