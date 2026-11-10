CREATE TABLE `post_revisions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`version` integer NOT NULL,
	`title` text NOT NULL,
	`author` text NOT NULL,
	`content` text NOT NULL,
	`content_json` text NOT NULL,
	`editor_id` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_revisions_post_version` ON `post_revisions` (`post_id`,`version`);--> statement-breakpoint
CREATE INDEX `idx_revisions_post` ON `post_revisions` (`post_id`);--> statement-breakpoint
CREATE TABLE `share_links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`code` text NOT NULL,
	`visitor_id` text NOT NULL,
	`clicks` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_share_code` ON `share_links` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_share_post_visitor` ON `share_links` (`post_id`,`visitor_id`);--> statement-breakpoint
CREATE INDEX `idx_share_created_at` ON `share_links` (`created_at`);--> statement-breakpoint
ALTER TABLE `posts` ADD `updated_at` text;