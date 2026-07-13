ALTER TABLE "quiz_attempts" ADD COLUMN "submission_id" text;--> statement-breakpoint
UPDATE "quiz_attempts" SET "submission_id" = "id" WHERE "submission_id" IS NULL;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ALTER COLUMN "submission_id" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "quiz_attempts_owner_block_submission_uidx" ON "quiz_attempts" USING btree ("owner_id","block_id","submission_id");
