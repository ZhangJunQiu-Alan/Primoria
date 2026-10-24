CREATE TABLE "folder_quiz_answers" (
	"session_id" text NOT NULL,
	"question_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"graph_id" text NOT NULL,
	"concept_id" text NOT NULL,
	"ordinal" integer NOT NULL,
	"selected_id" text NOT NULL,
	"is_correct" boolean NOT NULL,
	"first_attempt" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "folder_quiz_answers_session_id_question_id_pk" PRIMARY KEY("session_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "folder_quiz_questions" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"folder_id" text NOT NULL,
	"concept_id" text NOT NULL,
	"language" text NOT NULL,
	"question" text NOT NULL,
	"choices" jsonb NOT NULL,
	"correct_id" text NOT NULL,
	"explanation" text DEFAULT '' NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"generator_version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "folder_quiz_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"folder_id" text NOT NULL,
	"graph_id" text NOT NULL,
	"size" integer NOT NULL,
	"items" jsonb NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"submission_id" text,
	"answers" jsonb,
	"score" integer,
	"total" integer,
	"results" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	CONSTRAINT "folder_quiz_sessions_status_check" CHECK ("folder_quiz_sessions"."status" in ('open', 'submitted'))
);
--> statement-breakpoint
ALTER TABLE "folder_quiz_answers" ADD CONSTRAINT "folder_quiz_answers_session_id_folder_quiz_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."folder_quiz_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folder_quiz_answers" ADD CONSTRAINT "folder_quiz_answers_question_id_folder_quiz_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."folder_quiz_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folder_quiz_answers" ADD CONSTRAINT "folder_quiz_answers_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folder_quiz_questions" ADD CONSTRAINT "folder_quiz_questions_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folder_quiz_questions" ADD CONSTRAINT "folder_quiz_questions_folder_id_material_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."material_folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folder_quiz_sessions" ADD CONSTRAINT "folder_quiz_sessions_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folder_quiz_sessions" ADD CONSTRAINT "folder_quiz_sessions_folder_id_material_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."material_folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "folder_quiz_answers_first_attempt_uidx" ON "folder_quiz_answers" USING btree ("owner_id","question_id") WHERE "folder_quiz_answers"."first_attempt";--> statement-breakpoint
CREATE INDEX "folder_quiz_answers_window_idx" ON "folder_quiz_answers" USING btree ("owner_id","graph_id","concept_id","created_at");--> statement-breakpoint
CREATE INDEX "folder_quiz_questions_concept_idx" ON "folder_quiz_questions" USING btree ("owner_id","folder_id","concept_id");--> statement-breakpoint
CREATE INDEX "folder_quiz_sessions_owner_folder_idx" ON "folder_quiz_sessions" USING btree ("owner_id","folder_id","created_at");