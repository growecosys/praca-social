CREATE TABLE `activity_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text,
	`action` text NOT NULL,
	`entity_type` text DEFAULT '' NOT NULL,
	`entity_id` text DEFAULT '' NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_activity_user` ON `activity_events` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_activity_created_at` ON `activity_events` (`created_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_sessions_token` ON `sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_sessions_user` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`display_name` text NOT NULL,
	`secret_hash` text NOT NULL,
	`secret_salt` text NOT NULL,
	`profile_complete` integer DEFAULT false NOT NULL,
	`answers_json` text DEFAULT '[]' NOT NULL,
	`role_title` text DEFAULT '' NOT NULL,
	`manifesto` text DEFAULT '' NOT NULL,
	`avatar_json` text DEFAULT '{}' NOT NULL,
	`generations_used` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_username` ON `users` (`username`);--> statement-breakpoint
ALTER TABLE `comments` ADD `user_id` text;--> statement-breakpoint
ALTER TABLE `likes` ADD `user_id` text;--> statement-breakpoint
ALTER TABLE `share_links` ADD `user_id` text;