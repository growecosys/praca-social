CREATE TABLE "account_emails" (
	"user_id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"verified_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_recovery" (
	"user_id" text PRIMARY KEY NOT NULL,
	"question_1" text NOT NULL,
	"answer_1_hash" text NOT NULL,
	"answer_1_salt" text NOT NULL,
	"question_2" text NOT NULL,
	"answer_2_hash" text NOT NULL,
	"answer_2_salt" text NOT NULL,
	"attempts" bigint DEFAULT 0 NOT NULL,
	"locked_until" text,
	"updated_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"entity_type" text DEFAULT '' NOT NULL,
	"entity_id" text DEFAULT '' NOT NULL,
	"metadata_json" text DEFAULT '{}' NOT NULL,
	"created_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "after_hours_states" (
	"user_id" text PRIMARY KEY NOT NULL,
	"state_json" text NOT NULL,
	"revision" bigint DEFAULT 0 NOT NULL,
	"updated_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "arcade_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"game_id" text NOT NULL,
	"version" bigint NOT NULL,
	"seed" bigint NOT NULL,
	"started_ms" bigint NOT NULL,
	"finished_ms" bigint,
	"status" text DEFAULT 'playing' NOT NULL,
	"score" bigint DEFAULT 0 NOT NULL,
	"deliveries" bigint DEFAULT 0 NOT NULL,
	"result_json" text,
	"replay_json" text,
	"input_hash" text
);
--> statement-breakpoint
CREATE TABLE "assistant_usage" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"visitor_id" text NOT NULL,
	"user_id" text,
	"day_key" text NOT NULL,
	"messages" bigint DEFAULT 0 NOT NULL,
	"input_tokens" bigint DEFAULT 0 NOT NULL,
	"output_tokens" bigint DEFAULT 0 NOT NULL,
	"updated_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_email_limits" (
	"id" text PRIMARY KEY NOT NULL,
	"attempts" bigint DEFAULT 1 NOT NULL,
	"expires_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "avatar_generations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"image_key" text NOT NULL,
	"prompt" text DEFAULT '' NOT NULL,
	"direction" text DEFAULT '' NOT NULL,
	"active" integer DEFAULT 0 NOT NULL,
	"created_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "circle_agreements" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"circle_id" bigint NOT NULL,
	"cycle_id" bigint NOT NULL,
	"creator_id" text NOT NULL,
	"assignee_id" text NOT NULL,
	"reviewer_id" text NOT NULL,
	"title" text NOT NULL,
	"role" text DEFAULT '' NOT NULL,
	"scope" text NOT NULL,
	"criteria" text NOT NULL,
	"terms" text NOT NULL,
	"amount" bigint DEFAULT 0 NOT NULL,
	"due" text NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"evidence" text DEFAULT '' NOT NULL,
	"agreed_at" text,
	"created_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "circle_cycles" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"circle_id" bigint NOT NULL,
	"name" text NOT NULL,
	"goal" text NOT NULL,
	"start" text NOT NULL,
	"end" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "circle_entries" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"circle_id" bigint NOT NULL,
	"author_id" text NOT NULL,
	"kind" text NOT NULL,
	"body" text NOT NULL,
	"assignee_id" text,
	"status" text DEFAULT 'available' NOT NULL,
	"created_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "circle_funds" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"circle_id" bigint NOT NULL,
	"cycle_id" bigint NOT NULL,
	"name" text NOT NULL,
	"amount" bigint NOT NULL,
	"confirmed" integer DEFAULT 0 NOT NULL,
	"note" text NOT NULL,
	"creator_id" text NOT NULL,
	"created_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "circle_members" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"circle_id" bigint NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'invited' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "circle_messages" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"circle_id" bigint NOT NULL,
	"author_id" text NOT NULL,
	"client_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "circle_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"circle_id" bigint NOT NULL,
	"agreement_id" bigint NOT NULL,
	"fund_id" bigint NOT NULL,
	"amount" bigint NOT NULL,
	"date" text NOT NULL,
	"note" text NOT NULL,
	"actor_id" text NOT NULL,
	"voided_at" text,
	"void_reason" text,
	"created_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "circles" (
	"deleted_at" text,
	"chat_enabled" integer DEFAULT 0 NOT NULL,
	"id" bigserial PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"mission" text NOT NULL,
	"success" text NOT NULL,
	"emblem" text DEFAULT '🌱' NOT NULL,
	"visibility" text DEFAULT 'public' NOT NULL,
	"status" text DEFAULT 'gathering' NOT NULL,
	"created_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"post_id" bigint NOT NULL,
	"visitor_id" text NOT NULL,
	"user_id" text,
	"display_name" text DEFAULT 'Anônimo' NOT NULL,
	"anonymous" integer DEFAULT 0 NOT NULL,
	"body" text NOT NULL,
	"created_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "common_assets" (
	"placement_json" text DEFAULT '{}' NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"element" text NOT NULL,
	"url" text NOT NULL,
	"prompt" text NOT NULL,
	"author_id" text,
	"active" bigint DEFAULT 0 NOT NULL,
	"created_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "common_generations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"month_key" text NOT NULL,
	"element" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "common_governance_proposals" (
	"id" text PRIMARY KEY NOT NULL,
	"author_id" text,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"scope" text NOT NULL,
	"change" text NOT NULL,
	"impact" text NOT NULL,
	"rules" text,
	"cancelled_at" text,
	"created_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "common_proposal_assets" (
	"proposal_id" text NOT NULL,
	"asset_id" text NOT NULL,
	"month_key" text NOT NULL,
	"released_at" text
);
--> statement-breakpoint
CREATE TABLE "common_proposals" (
	"id" text PRIMARY KEY NOT NULL,
	"asset_id" text NOT NULL,
	"creator_id" text NOT NULL,
	"kind" text NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"month_key" text NOT NULL,
	"closes_at" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"yes_count" bigint DEFAULT 0 NOT NULL,
	"no_count" bigint DEFAULT 0 NOT NULL,
	"closed_at" text,
	"created_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "common_signals" (
	"id" text PRIMARY KEY NOT NULL,
	"author_id" text,
	"body" text NOT NULL,
	"page" text NOT NULL,
	"hide_name" integer NOT NULL,
	"created_at" bigint NOT NULL,
	"attempts" bigint DEFAULT 0 NOT NULL,
	"started_at" bigint,
	"analysis" text,
	"related_id" text
);
--> statement-breakpoint
CREATE TABLE "common_votes" (
	"proposal_id" text NOT NULL,
	"user_id" text NOT NULL,
	"value" bigint NOT NULL,
	"updated_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connections" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_a" text NOT NULL,
	"user_b" text NOT NULL,
	"created_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_auth_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"purpose" text NOT NULL,
	"user_id" text,
	"token_hash" text NOT NULL,
	"code_hash" text,
	"request_hash" text NOT NULL,
	"expires_at" text NOT NULL,
	"consumed_at" text,
	"created_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_achievements" (
	"user_id" text NOT NULL,
	"game_id" text NOT NULL,
	"key" text NOT NULL,
	"xp" bigint NOT NULL,
	"run_id" text NOT NULL,
	"earned_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "likes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"post_id" bigint NOT NULL,
	"visitor_id" text NOT NULL,
	"user_id" text,
	"created_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"recipient_id" text NOT NULL,
	"actor_id" text,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"href" text DEFAULT '/' NOT NULL,
	"dedupe_key" text,
	"read_at" text,
	"created_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pending_account_emails" (
	"user_id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"created_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poke_mutes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"muted_user_id" text NOT NULL,
	"created_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pokes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"sender_id" text NOT NULL,
	"recipient_id" text NOT NULL,
	"kind" text DEFAULT 'mystery' NOT NULL,
	"target_post_id" bigint,
	"status" text DEFAULT 'pending' NOT NULL,
	"seen_at" text,
	"resolved_at" text,
	"expires_at" text DEFAULT to_char(timezone('utc', now()) + interval '7 days', 'YYYY-MM-DD HH24:MI:SS') NOT NULL,
	"created_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_images" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"prompt" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"image_key" text,
	"created_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_revisions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"post_id" bigint NOT NULL,
	"version" bigint NOT NULL,
	"title" text NOT NULL,
	"author" text NOT NULL,
	"content" text NOT NULL,
	"content_json" text NOT NULL,
	"editor_id" text DEFAULT '' NOT NULL,
	"created_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_views" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"post_id" bigint NOT NULL,
	"visitor_id" text NOT NULL,
	"user_id" text,
	"views" bigint DEFAULT 1 NOT NULL,
	"first_seen_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL,
	"last_seen_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"author" text DEFAULT 'Anônimo' NOT NULL,
	"content" text NOT NULL,
	"content_json" text DEFAULT '[]' NOT NULL,
	"owner_id" text DEFAULT '' NOT NULL,
	"created_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "profile_aliases" (
	"username" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"inviter_id" text NOT NULL,
	"invited_user_id" text NOT NULL,
	"share_link_id" bigint,
	"visitor_id" text NOT NULL,
	"qualified_at" text,
	"created_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_generations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"answers_json" text NOT NULL,
	"role_title" text NOT NULL,
	"manifesto" text NOT NULL,
	"avatar_json" text NOT NULL,
	"mapping_json" text DEFAULT '{}' NOT NULL,
	"explanation" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL,
	"applied_at" text
);
--> statement-breakpoint
CREATE TABLE "rpg_characters" (
	"user_id" text PRIMARY KEY NOT NULL,
	"state_json" text NOT NULL,
	"revision" bigint DEFAULT 0 NOT NULL,
	"updated_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rpg_usage" (
	"user_id" text NOT NULL,
	"day" text NOT NULL,
	"calls" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "safety_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"reporter_id" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" text NOT NULL,
	"created_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "share_links" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"post_id" bigint NOT NULL,
	"code" text NOT NULL,
	"visitor_id" text NOT NULL,
	"user_id" text,
	"clicks" bigint DEFAULT 0 NOT NULL,
	"created_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "share_visits" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"share_link_id" bigint NOT NULL,
	"visitor_id" text NOT NULL,
	"user_id" text,
	"visits" bigint DEFAULT 1 NOT NULL,
	"first_seen_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL,
	"last_seen_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"active" bigint,
	"state_json" text NOT NULL,
	"revision" bigint DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_messages" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"author_id" text NOT NULL,
	"client_id" text NOT NULL,
	"body" text NOT NULL,
	"created_ms" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_blocks" (
	"user_id" text NOT NULL,
	"blocked_id" text NOT NULL,
	"created_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"deleted_at" text,
	"secret_hash" text NOT NULL,
	"secret_salt" text NOT NULL,
	"profile_complete" integer DEFAULT 0 NOT NULL,
	"answers_json" text DEFAULT '[]' NOT NULL,
	"role_title" text DEFAULT '' NOT NULL,
	"manifesto" text DEFAULT '' NOT NULL,
	"avatar_json" text DEFAULT '{}' NOT NULL,
	"avatar_image_key" text,
	"image_generations_used" bigint DEFAULT 0 NOT NULL,
	"generations_used" bigint DEFAULT 0 NOT NULL,
	"created_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "weekly_rewards" (
	"week_key" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"score" bigint NOT NULL,
	"awarded_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS') NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account_emails" ADD CONSTRAINT "account_emails_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_recovery" ADD CONSTRAINT "account_recovery_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "after_hours_states" ADD CONSTRAINT "after_hours_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "arcade_runs" ADD CONSTRAINT "arcade_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_usage" ADD CONSTRAINT "assistant_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avatar_generations" ADD CONSTRAINT "avatar_generations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_agreements" ADD CONSTRAINT "circle_agreements_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_agreements" ADD CONSTRAINT "circle_agreements_cycle_id_circle_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."circle_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_agreements" ADD CONSTRAINT "circle_agreements_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_agreements" ADD CONSTRAINT "circle_agreements_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_agreements" ADD CONSTRAINT "circle_agreements_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_cycles" ADD CONSTRAINT "circle_cycles_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_entries" ADD CONSTRAINT "circle_entries_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_entries" ADD CONSTRAINT "circle_entries_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_entries" ADD CONSTRAINT "circle_entries_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_funds" ADD CONSTRAINT "circle_funds_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_funds" ADD CONSTRAINT "circle_funds_cycle_id_circle_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."circle_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_funds" ADD CONSTRAINT "circle_funds_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_members" ADD CONSTRAINT "circle_members_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_members" ADD CONSTRAINT "circle_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_messages" ADD CONSTRAINT "circle_messages_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_messages" ADD CONSTRAINT "circle_messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_payments" ADD CONSTRAINT "circle_payments_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_payments" ADD CONSTRAINT "circle_payments_agreement_id_circle_agreements_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."circle_agreements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_payments" ADD CONSTRAINT "circle_payments_fund_id_circle_funds_id_fk" FOREIGN KEY ("fund_id") REFERENCES "public"."circle_funds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_payments" ADD CONSTRAINT "circle_payments_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circles" ADD CONSTRAINT "circles_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "common_assets" ADD CONSTRAINT "common_assets_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "common_generations" ADD CONSTRAINT "common_generations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "common_governance_proposals" ADD CONSTRAINT "common_governance_proposals_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "common_proposal_assets" ADD CONSTRAINT "common_proposal_assets_proposal_id_common_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."common_proposals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "common_proposal_assets" ADD CONSTRAINT "common_proposal_assets_asset_id_common_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."common_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "common_proposals" ADD CONSTRAINT "common_proposals_asset_id_common_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."common_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "common_proposals" ADD CONSTRAINT "common_proposals_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "common_signals" ADD CONSTRAINT "common_signals_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "common_votes" ADD CONSTRAINT "common_votes_proposal_id_common_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."common_proposals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "common_votes" ADD CONSTRAINT "common_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_user_a_users_id_fk" FOREIGN KEY ("user_a") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_user_b_users_id_fk" FOREIGN KEY ("user_b") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_auth_tokens" ADD CONSTRAINT "email_auth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_achievements" ADD CONSTRAINT "game_achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_account_emails" ADD CONSTRAINT "pending_account_emails_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poke_mutes" ADD CONSTRAINT "poke_mutes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poke_mutes" ADD CONSTRAINT "poke_mutes_muted_user_id_users_id_fk" FOREIGN KEY ("muted_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pokes" ADD CONSTRAINT "pokes_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pokes" ADD CONSTRAINT "pokes_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pokes" ADD CONSTRAINT "pokes_target_post_id_posts_id_fk" FOREIGN KEY ("target_post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_images" ADD CONSTRAINT "post_images_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_revisions" ADD CONSTRAINT "post_revisions_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_views" ADD CONSTRAINT "post_views_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_aliases" ADD CONSTRAINT "profile_aliases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_invited_user_id_users_id_fk" FOREIGN KEY ("invited_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_share_link_id_share_links_id_fk" FOREIGN KEY ("share_link_id") REFERENCES "public"."share_links"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_generations" ADD CONSTRAINT "role_generations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rpg_characters" ADD CONSTRAINT "rpg_characters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rpg_usage" ADD CONSTRAINT "rpg_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_visits" ADD CONSTRAINT "share_visits_share_link_id_share_links_id_fk" FOREIGN KEY ("share_link_id") REFERENCES "public"."share_links"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_messages" ADD CONSTRAINT "story_messages_campaign_id_story_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."story_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_messages" ADD CONSTRAINT "story_messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_rewards" ADD CONSTRAINT "weekly_rewards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_email_unique" ON "account_emails" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_activity_user" ON "activity_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_activity_created_at" ON "activity_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "arcade_runs_user_game" ON "arcade_runs" USING btree ("user_id","game_id","status");--> statement-breakpoint
CREATE INDEX "arcade_runs_rate" ON "arcade_runs" USING btree ("user_id","started_ms");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_assistant_usage_visitor_day" ON "assistant_usage" USING btree ("visitor_id","day_key");--> statement-breakpoint
CREATE INDEX "idx_assistant_usage_user_day" ON "assistant_usage" USING btree ("user_id","day_key");--> statement-breakpoint
CREATE INDEX "idx_avatar_generations_user" ON "avatar_generations" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_avatar_generations_image_key" ON "avatar_generations" USING btree ("image_key");--> statement-breakpoint
CREATE INDEX "circle_agreements_cycle" ON "circle_agreements" USING btree ("circle_id","cycle_id");--> statement-breakpoint
CREATE UNIQUE INDEX "circle_member_pair" ON "circle_members" USING btree ("circle_id","user_id");--> statement-breakpoint
CREATE INDEX "circle_messages_timeline" ON "circle_messages" USING btree ("circle_id","id");--> statement-breakpoint
CREATE INDEX "circle_messages_rate" ON "circle_messages" USING btree ("author_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "circle_messages_retry" ON "circle_messages" USING btree ("circle_id","author_id","client_id");--> statement-breakpoint
CREATE INDEX "circle_payments_circle" ON "circle_payments" USING btree ("circle_id");--> statement-breakpoint
CREATE INDEX "idx_comments_post" ON "comments" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "idx_comments_created_at" ON "comments" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "common_generation_month" ON "common_generations" USING btree ("user_id","month_key") WHERE "common_generations"."status" != 'failed';--> statement-breakpoint
CREATE INDEX "idx_common_governance_created" ON "common_governance_proposals" USING btree ("created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "common_removal_asset_month" ON "common_proposal_assets" USING btree ("asset_id","month_key") WHERE "common_proposal_assets"."released_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "common_asset_proposal_month" ON "common_proposals" USING btree ("asset_id","kind","month_key") WHERE "common_proposals"."status" != 'cancelled';--> statement-breakpoint
CREATE INDEX "common_proposals_deadline" ON "common_proposals" USING btree ("status","closes_at");--> statement-breakpoint
CREATE INDEX "common_signals_recent" ON "common_signals" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "common_signals_author" ON "common_signals" USING btree ("author_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "common_vote_pair" ON "common_votes" USING btree ("proposal_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "connections_pair" ON "connections" USING btree ("user_a","user_b");--> statement-breakpoint
CREATE UNIQUE INDEX "email_token_hash_unique" ON "email_auth_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "email_token_expiry" ON "email_auth_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "game_achievement_once" ON "game_achievements" USING btree ("user_id","game_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_likes_post_visitor" ON "likes" USING btree ("post_id","visitor_id");--> statement-breakpoint
CREATE INDEX "idx_likes_created_at" ON "likes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_notifications_recipient_read" ON "notifications" USING btree ("recipient_id","read_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_notifications_dedupe" ON "notifications" USING btree ("dedupe_key");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_poke_mutes_pair" ON "poke_mutes" USING btree ("user_id","muted_user_id");--> statement-breakpoint
CREATE INDEX "idx_pokes_recipient_seen" ON "pokes" USING btree ("recipient_id","seen_at");--> statement-breakpoint
CREATE INDEX "idx_pokes_recipient_status" ON "pokes" USING btree ("recipient_id","status","expires_at");--> statement-breakpoint
CREATE INDEX "idx_pokes_sender_created" ON "pokes" USING btree ("sender_id","created_at");--> statement-breakpoint
CREATE INDEX "post_images_user_status" ON "post_images" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_revisions_post_version" ON "post_revisions" USING btree ("post_id","version");--> statement-breakpoint
CREATE INDEX "idx_revisions_post" ON "post_revisions" USING btree ("post_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_post_views_post_visitor" ON "post_views" USING btree ("post_id","visitor_id");--> statement-breakpoint
CREATE INDEX "idx_post_views_first_seen" ON "post_views" USING btree ("first_seen_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_posts_slug" ON "posts" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_referrals_invited" ON "referrals" USING btree ("invited_user_id");--> statement-breakpoint
CREATE INDEX "idx_referrals_inviter" ON "referrals" USING btree ("inviter_id");--> statement-breakpoint
CREATE INDEX "idx_role_generations_user_status" ON "role_generations" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "rpg_usage_day" ON "rpg_usage" USING btree ("user_id","day");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_sessions_token" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_sessions_user" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_share_code" ON "share_links" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_share_post_user" ON "share_links" USING btree ("post_id","user_id") WHERE "share_links"."user_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_share_post_anon_visitor" ON "share_links" USING btree ("post_id","visitor_id") WHERE "share_links"."user_id" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_share_created_at" ON "share_links" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_share_visits_link_visitor" ON "share_visits" USING btree ("share_link_id","visitor_id");--> statement-breakpoint
CREATE INDEX "idx_share_visits_first_seen" ON "share_visits" USING btree ("first_seen_at");--> statement-breakpoint
CREATE UNIQUE INDEX "story_one_current" ON "story_campaigns" USING btree ("active");--> statement-breakpoint
CREATE UNIQUE INDEX "story_message_once" ON "story_messages" USING btree ("campaign_id","author_id","client_id");--> statement-breakpoint
CREATE INDEX "story_message_timeline" ON "story_messages" USING btree ("campaign_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_blocks_pair" ON "user_blocks" USING btree ("user_id","blocked_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_username" ON "users" USING btree ("username");