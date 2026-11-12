CREATE TABLE `pokes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sender_id` text NOT NULL,
	`recipient_id` text NOT NULL,
	`seen_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recipient_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_pokes_recipient_seen` ON `pokes` (`recipient_id`,`seen_at`);--> statement-breakpoint
CREATE INDEX `idx_pokes_sender_created` ON `pokes` (`sender_id`,`created_at`);