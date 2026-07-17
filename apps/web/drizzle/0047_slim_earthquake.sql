CREATE TABLE "achievement_unlocks" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"code" text NOT NULL,
	"source_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"unlocked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_quest_completions" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"local_date" text NOT NULL,
	"quest_code" text NOT NULL,
	"source_id" text,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_quest_completions_local_date_check" CHECK ("daily_quest_completions"."local_date" ~ '^\d{4}-\d{2}-\d{2}$')
);
--> statement-breakpoint
CREATE TABLE "player_progress" (
	"owner_id" text PRIMARY KEY NOT NULL,
	"total_xp" integer DEFAULT 0 NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"last_quest_date" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_progress_total_xp_check" CHECK ("player_progress"."total_xp" >= 0),
	CONSTRAINT "player_progress_streak_check" CHECK ("player_progress"."current_streak" >= 0 and "player_progress"."longest_streak" >= "player_progress"."current_streak")
);
--> statement-breakpoint
CREATE TABLE "xp_awards" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"rule_code" text NOT NULL,
	"dedupe_key" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text,
	"amount" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "xp_awards_amount_check" CHECK ("xp_awards"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "achievement_unlocks" ADD CONSTRAINT "achievement_unlocks_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_quest_completions" ADD CONSTRAINT "daily_quest_completions_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_progress" ADD CONSTRAINT "player_progress_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_awards" ADD CONSTRAINT "xp_awards_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "achievement_unlocks_owner_code_uidx" ON "achievement_unlocks" USING btree ("owner_id","code");--> statement-breakpoint
CREATE INDEX "achievement_unlocks_owner_unlocked_idx" ON "achievement_unlocks" USING btree ("owner_id","unlocked_at");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_quest_completions_owner_date_quest_uidx" ON "daily_quest_completions" USING btree ("owner_id","local_date","quest_code");--> statement-breakpoint
CREATE INDEX "daily_quest_completions_owner_date_idx" ON "daily_quest_completions" USING btree ("owner_id","local_date");--> statement-breakpoint
CREATE UNIQUE INDEX "xp_awards_owner_rule_dedupe_uidx" ON "xp_awards" USING btree ("owner_id","rule_code","dedupe_key");--> statement-breakpoint
CREATE INDEX "xp_awards_owner_created_idx" ON "xp_awards" USING btree ("owner_id","created_at");--> statement-breakpoint
INSERT INTO "player_progress" ("owner_id")
SELECT "id" FROM "users"
ON CONFLICT ("owner_id") DO NOTHING;
