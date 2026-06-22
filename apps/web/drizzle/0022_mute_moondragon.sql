ALTER TABLE "lessons" ALTER COLUMN "blocks" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "lessons" ALTER COLUMN "estimated_minutes" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "status" text DEFAULT 'planned' NOT NULL;