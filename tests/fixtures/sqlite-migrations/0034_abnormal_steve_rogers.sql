CREATE TABLE `story_campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`active` integer,
	`state_json` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `story_one_current` ON `story_campaigns` (`active`);--> statement-breakpoint
CREATE TABLE `story_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`campaign_id` text NOT NULL,
	`author_id` text NOT NULL,
	`client_id` text NOT NULL,
	`body` text NOT NULL,
	`created_ms` integer NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `story_campaigns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `story_message_once` ON `story_messages` (`campaign_id`,`author_id`,`client_id`);--> statement-breakpoint
CREATE INDEX `story_message_timeline` ON `story_messages` (`campaign_id`,`id`);