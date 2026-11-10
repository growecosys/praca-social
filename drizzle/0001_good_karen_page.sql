ALTER TABLE `posts` ADD `content_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `posts` ADD `owner_id` text DEFAULT '' NOT NULL;