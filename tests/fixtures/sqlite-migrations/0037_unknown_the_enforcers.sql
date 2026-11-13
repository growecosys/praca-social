CREATE TABLE `common_signals` (
	`id` text PRIMARY KEY NOT NULL,
	`author_id` text,
	`body` text NOT NULL,
	`page` text NOT NULL,
	`hide_name` integer NOT NULL,
	`created_at` integer NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`started_at` integer,
	`analysis` text,
	`related_id` text,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `common_signals_recent` ON `common_signals` (`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `common_signals_author` ON `common_signals` (`author_id`,`created_at`);