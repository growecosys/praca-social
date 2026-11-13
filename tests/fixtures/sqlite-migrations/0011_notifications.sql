CREATE TABLE `notifications` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `recipient_id` text NOT NULL,
  `actor_id` text,
  `type` text NOT NULL,
  `title` text NOT NULL,
  `body` text DEFAULT '' NOT NULL,
  `href` text DEFAULT '/' NOT NULL,
  `dedupe_key` text,
  `read_at` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`recipient_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_notifications_recipient_read` ON `notifications` (`recipient_id`,`read_at`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_notifications_dedupe` ON `notifications` (`dedupe_key`);
