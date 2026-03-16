CREATE TYPE "public"."difficulty" AS ENUM('junior', 'mid', 'senior', 'staff');--> statement-breakpoint
CREATE TYPE "public"."message_role" AS ENUM('user', 'assistant', 'system');--> statement-breakpoint
CREATE TYPE "public"."message_source" AS ENUM('chat', 'voice_transcript', 'observation');--> statement-breakpoint
CREATE TYPE "public"."phase" AS ENUM('clarification', 'high_level', 'deep_dive', 'wrap_up');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('free', 'pro', 'pro_voice', 'team');--> statement-breakpoint
CREATE TYPE "public"."session_mode" AS ENUM('chat', 'voice', 'hybrid');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('active', 'completed', 'abandoned');--> statement-breakpoint
CREATE TABLE "diagram_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"graph_json" jsonb NOT NULL,
	"trigger" text DEFAULT 'change',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"overall_score" integer,
	"summary" text,
	"dimensions" jsonb,
	"strengths" jsonb,
	"improvements" jsonb,
	"detailed" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "evaluations_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"role" "message_role" NOT NULL,
	"content" text NOT NULL,
	"source" "message_source" DEFAULT 'chat',
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"category" text,
	"priority" text,
	"observation" text,
	"suggested_question" text,
	"action_taken" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "problems" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"difficulty" "difficulty" NOT NULL,
	"category" text[] DEFAULT '{}',
	"companies" text[] DEFAULT '{}',
	"time_limit" integer DEFAULT 45,
	"statement" text NOT NULL,
	"clarifications" jsonb DEFAULT '[]'::jsonb,
	"evaluation_guide" jsonb NOT NULL,
	"reference_design" jsonb,
	"is_published" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"problem_id" text NOT NULL,
	"status" "session_status" DEFAULT 'active',
	"mode" "session_mode" DEFAULT 'chat',
	"difficulty" "difficulty",
	"current_phase" "phase" DEFAULT 'clarification',
	"started_at" timestamp with time zone DEFAULT now(),
	"ended_at" timestamp with time zone,
	"duration_sec" integer
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"avatar_url" text,
	"plan" "plan" DEFAULT 'free',
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "diagram_snapshots" ADD CONSTRAINT "diagram_snapshots_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observations" ADD CONSTRAINT "observations_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "snapshots_session_idx" ON "diagram_snapshots" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "messages_session_idx" ON "messages" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "observations_session_idx" ON "observations" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_status_idx" ON "sessions" USING btree ("status");