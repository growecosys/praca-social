CREATE TABLE `circle_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`circle_id` integer NOT NULL,
	`author_id` text NOT NULL,
	`client_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`circle_id`) REFERENCES `circles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `circle_messages_timeline` ON `circle_messages` (`circle_id`,`id`);--> statement-breakpoint
CREATE INDEX `circle_messages_rate` ON `circle_messages` (`author_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `circle_messages_retry` ON `circle_messages` (`circle_id`,`author_id`,`client_id`);