CREATE TABLE `assistant_usage` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `visitor_id` text NOT NULL,
  `user_id` text,
  `day_key` text NOT NULL,
  `messages` integer DEFAULT 0 NOT NULL,
  `input_tokens` integer DEFAULT 0 NOT NULL,
  `output_tokens` integer DEFAULT 0 NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_assistant_usage_visitor_day` ON `assistant_usage` (`visitor_id`,`day_key`);
--> statement-breakpoint
CREATE INDEX `idx_assistant_usage_user_day` ON `assistant_usage` (`user_id`,`day_key`);
